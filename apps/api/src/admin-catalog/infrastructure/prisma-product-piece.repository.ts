import { Inject, Injectable } from '@nestjs/common';
import { DomainError, type ProductPiece, type ProductPieceRepository } from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

@Injectable()
export class PrismaProductPieceRepository implements ProductPieceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listByProduct(productId: string): Promise<ProductPiece[]> {
    return this.prisma.productPiece.findMany({
      where: { productId },
      orderBy: { serial: 'desc' },
    });
  }

  findById(id: string): Promise<ProductPiece | null> {
    return this.prisma.productPiece.findUnique({ where: { id } });
  }

  async createBatch(productId: string, codes: readonly string[]): Promise<ProductPiece[]> {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
          orderBy: { serial: 'asc' },
        });
      });
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

  markVoided(id: string): Promise<ProductPiece> {
    return this.prisma.productPiece.update({ where: { id }, data: { voidedAt: new Date() } });
  }
}
