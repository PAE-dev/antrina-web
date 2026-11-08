import { Inject, Injectable } from '@nestjs/common';
import {
  DomainError,
  isToritoCategory,
  type ProductPiece,
  type ProductPieceRepository,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

const pieceInclude = {
  torito: { select: { claimedAt: true } },
} satisfies Prisma.ProductPieceInclude;

type PieceRecord = Prisma.ProductPieceGetPayload<{ include: typeof pieceInclude }>;

function toPiece(record: PieceRecord): ProductPiece {
  return {
    id: record.id,
    productId: record.productId,
    serial: record.serial,
    code: record.code,
    voidedAt: record.voidedAt,
    claimedAt: record.torito?.claimedAt ?? null,
    createdAt: record.createdAt,
  };
}

@Injectable()
export class PrismaProductPieceRepository implements ProductPieceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listByProduct(productId: string): Promise<ProductPiece[]> {
    const records = await this.prisma.productPiece.findMany({
      where: { productId },
      include: pieceInclude,
      orderBy: { serial: 'desc' },
    });
    return records.map(toPiece);
  }

  async findById(id: string): Promise<ProductPiece | null> {
    const record = await this.prisma.productPiece.findUnique({
      where: { id },
      include: pieceInclude,
    });
    return record && toPiece(record);
  }

  async opensToritoExperience(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { category: { select: { slug: true, parent: { select: { slug: true } } } } },
    });
    const category = product?.category;
    return isToritoCategory(category?.slug ?? '', category?.parent?.slug ?? null);
  }

  async createBatch(productId: string, codes: readonly string[]): Promise<ProductPiece[]> {
    try {
      const records = await this.prisma.$transaction(async (tx) => {
        const last = await tx.productPiece.aggregate({
          where: { productId },
          _max: { serial: true },
        });
        const firstSerial = (last._max.serial ?? 0) + 1;
        await tx.productPiece.createMany({
          data: codes.map((code, index) => ({ productId, code, serial: firstSerial + index })),
        });
        return tx.productPiece.findMany({
          where: { productId, serial: { gte: firstSerial } },
          include: pieceInclude,
          orderBy: { serial: 'asc' },
        });
      });
      return records.map(toPiece);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainError(
          'Se generaron otros códigos a la vez. Vuelve a intentarlo.',
          'piece.duplicate_batch',
        );
      }
      throw error;
    }
  }

  async markVoided(id: string): Promise<ProductPiece> {
    const record = await this.prisma.productPiece.update({
      where: { id },
      data: { voidedAt: new Date() },
      include: pieceInclude,
    });
    return toPiece(record);
  }
}
