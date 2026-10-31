import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_LOCALE,
  DomainError,
  type StockChange,
  type StockMovement,
  type StockMovementCriteria,
  type StockMovementPage,
  type StockRepository,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

const movementInclude = {
  product: {
    select: {
      sku: true,
      translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
    },
  },
  order: { select: { number: true } },
  adminUser: { select: { name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementRecord = Prisma.StockMovementGetPayload<{ include: typeof movementInclude }>;

function toDomainMovement(record: MovementRecord): StockMovement {
  return {
    id: record.id,
    productId: record.productId,
    productName: record.product.translations[0]?.name ?? record.product.sku,
    productSku: record.product.sku,
    type: record.type,
    quantity: record.quantity,
    stockAfter: record.stockAfter,
    note: record.note,
    orderId: record.orderId,
    orderNumber: record.order?.number ?? null,
    adminName: record.adminUser?.name ?? null,
    createdAt: record.createdAt,
  };
}

@Injectable()
export class PrismaStockRepository implements StockRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  apply(change: StockChange): Promise<StockMovement> {
    return this.prisma.$transaction(async (tx) => {
      // Condición en el propio UPDATE: dos ajustes simultáneos no pueden dejar stock negativo.
      const { count } = await tx.product.updateMany({
        where: {
          id: change.productId,
          ...(change.quantity < 0 ? { stock: { gte: -change.quantity } } : {}),
        },
        data: { stock: { increment: change.quantity } },
      });
      const product = await tx.product.findUnique({
        where: { id: change.productId },
        select: { stock: true },
      });
      if (!product) throw new DomainError('Producto no encontrado', 'product.not_found');
      if (count === 0) {
        throw new DomainError(
          `No se pueden quitar ${-change.quantity} unidades: solo hay ${product.stock}`,
          'stock.insufficient',
        );
      }
      const record = await tx.stockMovement.create({
        data: {
          productId: change.productId,
          type: change.type,
          quantity: change.quantity,
          stockAfter: product.stock,
          note: change.note,
          adminUserId: change.actorId,
        },
        include: movementInclude,
      });
      return toDomainMovement(record);
    });
  }

  async list(criteria: StockMovementCriteria): Promise<StockMovementPage> {
    const where = criteria.productId ? { productId: criteria.productId } : {};
    const [records, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { items: records.map(toDomainMovement), total };
  }
}
