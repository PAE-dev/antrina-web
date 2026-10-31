import { Inject, Injectable } from '@nestjs/common';
import {
  type DateRange,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DomainError,
  type Order,
  type OrderCriteria,
  type OrderDraft,
  type OrderPage,
  type OrderRepository,
  type OrderStatus,
  orderTotals,
  type SalesTotals,
  type TopProduct,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

const orderInclude = {
  customer: true,
  lines: { orderBy: { id: 'asc' } },
  createdBy: { select: { name: true } },
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const MINUTE_MS = 60 * 1000;

function toDomainOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    number: record.number,
    status: record.status,
    channel: record.channel,
    paymentMethod: record.paymentMethod,
    customer: record.customer
      ? {
          id: record.customer.id,
          name: record.customer.name,
          phone: record.customer.phone,
          email: record.customer.email,
          note: record.customer.note,
          createdAt: record.customer.createdAt,
        }
      : null,
    currency: record.currency,
    lines: record.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    })),
    subtotalCents: record.subtotalCents,
    shippingCents: record.shippingCents,
    discountCents: record.discountCents,
    totalCents: record.totalCents,
    note: record.note,
    soldAt: record.soldAt,
    createdByName: record.createdBy?.name ?? null,
    createdAt: record.createdAt,
  };
}

/** Las cifras del resumen no cuentan ventas canceladas ni en otra moneda. */
const countedOrders = (range: DateRange): Prisma.OrderWhereInput => ({
  status: { not: 'CANCELLED' },
  currency: DEFAULT_CURRENCY,
  soldAt: { gte: range.from, lt: range.to },
});

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(draft: OrderDraft, actorId: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const customerId = await this.resolveCustomer(tx, draft);
      const { subtotalCents, totalCents } = orderTotals(draft);

      const order = await tx.order.create({
        data: {
          status: draft.status,
          channel: draft.channel,
          paymentMethod: draft.paymentMethod,
          customerId,
          currency: draft.currency,
          subtotalCents,
          shippingCents: draft.shippingCents,
          discountCents: draft.discountCents,
          totalCents,
          note: draft.note,
          soldAt: draft.soldAt,
          createdById: actorId,
        },
      });

      for (const line of draft.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          select: {
            sku: true,
            status: true,
            stock: true,
            translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
          },
        });
        if (!product || product.status === 'ARCHIVED') {
          throw new DomainError('Un producto de la venta ya no existe', 'product.not_found');
        }
        const name = product.translations[0]?.name ?? product.sku;
        // Condición en el propio UPDATE: dos ventas simultáneas no pueden vender la última unidad.
        const { count } = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (count === 0) {
          throw new DomainError(
            `Solo quedan ${product.stock} unidades de "${name}"`,
            'order.insufficient_stock',
          );
        }
        const { stock: stockAfter } = await tx.product.findUniqueOrThrow({
          where: { id: line.productId },
          select: { stock: true },
        });
        await tx.orderLine.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            sku: product.sku,
            name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: 'SALE',
            quantity: -line.quantity,
            stockAfter,
            orderId: order.id,
            adminUserId: actorId,
          },
        });
      }

      const record = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });
      return toDomainOrder(record);
    });
  }

  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    draft: OrderDraft,
  ): Promise<string | null> {
    if (draft.customerId) {
      const existing = await tx.customer.findUnique({
        where: { id: draft.customerId },
        select: { id: true },
      });
      if (!existing) throw new DomainError('Cliente no encontrado', 'customer.not_found');
      return existing.id;
    }
    if (!draft.customer) return null;
    if (!draft.customer.phone) {
      return (await tx.customer.create({ data: draft.customer, select: { id: true } })).id;
    }
    const customer = await tx.customer.upsert({
      where: { phone: draft.customer.phone },
      // Mismo teléfono = mismo cliente: no se pisan sus datos con los de esta venta.
      update: {},
      create: draft.customer,
      select: { id: true },
    });
    return customer.id;
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    return record ? toDomainOrder(record) : null;
  }

  async list(criteria: OrderCriteria): Promise<OrderPage> {
    const asNumber = criteria.query ? Number.parseInt(criteria.query.replace(/^#/, ''), 10) : NaN;
    const where: Prisma.OrderWhereInput = {
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.channel ? { channel: criteria.channel } : {}),
      ...(criteria.customerId ? { customerId: criteria.customerId } : {}),
      ...(criteria.query
        ? {
            OR: [
              ...(Number.isSafeInteger(asNumber) && asNumber <= 2_147_483_647
                ? [{ number: asNumber }]
                : []),
              { customer: { name: { contains: criteria.query, mode: 'insensitive' } } },
              { customer: { phone: { contains: criteria.query } } },
              { lines: { some: { name: { contains: criteria.query, mode: 'insensitive' } } } },
              { lines: { some: { sku: { contains: criteria.query, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ soldAt: 'desc' }, { number: 'desc' }],
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: records.map(toDomainOrder), total };
  }

  async updateStatus(id: string, status: Exclude<OrderStatus, 'CANCELLED'>): Promise<Order> {
    try {
      const record = await this.prisma.order.update({
        where: { id, status: { not: 'CANCELLED' } },
        data: { status },
        include: orderInclude,
      });
      return toDomainOrder(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new DomainError('Esta venta está cancelada', 'order.cancelled');
      }
      throw error;
    }
  }

  cancel(id: string, actorId: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // Condición en el propio UPDATE: cancelar dos veces no devuelve el stock dos veces.
      const { count } = await tx.order.updateMany({
        where: { id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      });
      if (count === 0) throw new DomainError('Esta venta ya está cancelada', 'order.cancelled');

      const lines = await tx.orderLine.findMany({ where: { orderId: id } });
      for (const line of lines) {
        const product = await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity } },
          select: { stock: true },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: 'SALE_CANCELLED',
            quantity: line.quantity,
            stockAfter: product.stock,
            orderId: id,
            adminUserId: actorId,
          },
        });
      }
      const record = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
      return toDomainOrder(record);
    });
  }

  async totals(range: DateRange): Promise<SalesTotals> {
    const where = countedOrders(range);
    const [orders, units] = await Promise.all([
      this.prisma.order.aggregate({ where, _count: { _all: true }, _sum: { totalCents: true } }),
      this.prisma.orderLine.aggregate({ where: { order: where }, _sum: { quantity: true } }),
    ]);
    return {
      orderCount: orders._count._all,
      unitCount: units._sum.quantity ?? 0,
      revenueCents: orders._sum.totalCents ?? 0,
    };
  }

  async dailyRevenue(range: DateRange, utcOffsetMinutes: number) {
    const orders = await this.prisma.order.findMany({
      where: countedOrders(range),
      select: { soldAt: true, totalCents: true },
    });
    const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
    for (const order of orders) {
      const civil = new Date(order.soldAt.getTime() + utcOffsetMinutes * MINUTE_MS);
      const day = civil.toISOString().slice(0, 10);
      const current = byDay.get(day) ?? { revenueCents: 0, orderCount: 0 };
      byDay.set(day, {
        revenueCents: current.revenueCents + order.totalCents,
        orderCount: current.orderCount + 1,
      });
    }
    return [...byDay.entries()].map(([day, totals]) => ({ day, ...totals }));
  }

  async topProducts(range: DateRange, limit: number): Promise<TopProduct[]> {
    const lines = await this.prisma.orderLine.findMany({
      where: { order: countedOrders(range) },
      select: { productId: true, name: true, sku: true, quantity: true, unitPriceCents: true },
    });
    const byProduct = new Map<string, TopProduct>();
    for (const line of lines) {
      const current = byProduct.get(line.productId);
      byProduct.set(line.productId, {
        productId: line.productId,
        name: line.name,
        sku: line.sku,
        unitCount: (current?.unitCount ?? 0) + line.quantity,
        revenueCents: (current?.revenueCents ?? 0) + line.quantity * line.unitPriceCents,
      });
    }
    return [...byProduct.values()]
      .toSorted((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, limit);
  }
}
