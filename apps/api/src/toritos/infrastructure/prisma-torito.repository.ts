import { Inject, Injectable } from '@nestjs/common';
import {
  DomainError,
  type GiftNote,
  isToritoCategory,
  personalityForSerial,
  type Torito,
  type ToritoColor,
  type ToritoDraft,
  type ToritoPiece,
  type ToritoRepository,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

const DEFAULT_LOCALE = 'es';

const productInclude = {
  translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
  category: { select: { slug: true, parent: { select: { slug: true } } } },
} satisfies Prisma.ProductInclude;

const pieceInclude = {
  product: { include: productInclude },
  torito: { select: { id: true, customerId: true } },
} satisfies Prisma.ProductPieceInclude;

const toritoInclude = {
  piece: { include: { product: { include: productInclude } } },
} satisfies Prisma.ToritoInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type PieceRecord = Prisma.ProductPieceGetPayload<{ include: typeof pieceInclude }>;
type ToritoRecord = Prisma.ToritoGetPayload<{ include: typeof toritoInclude }>;

const productName = (product: ProductRecord) => product.translations[0]?.name ?? product.sku;

function toGift(piece: {
  giftFrom: string | null;
  giftTo: string | null;
  giftMessage: string | null;
}): GiftNote | null {
  return piece.giftFrom && piece.giftMessage
    ? { from: piece.giftFrom, to: piece.giftTo, message: piece.giftMessage }
    : null;
}

function toPiece(record: PieceRecord): ToritoPiece {
  const { category } = record.product;
  return {
    id: record.id,
    code: record.code,
    serial: record.serial,
    productName: productName(record.product),
    isTorito: isToritoCategory(category?.slug ?? '', category?.parent?.slug ?? null),
    isVoided: record.voidedAt !== null,
    gift: toGift(record),
    claim: record.torito
      ? { toritoId: record.torito.id, customerId: record.torito.customerId }
      : null,
  };
}

function toTorito(record: ToritoRecord): Torito {
  return {
    id: record.id,
    customerId: record.customerId,
    name: record.name,
    color: record.colorCode as ToritoColor,
    personality: personalityForSerial(record.piece.serial),
    intention: record.intention,
    gift: toGift(record.piece),
    serial: record.piece.serial,
    productName: productName(record.piece.product),
    lastVisitOn: record.lastVisitOn,
    visitStreak: record.visitStreak,
    claimedAt: record.claimedAt,
  };
}

@Injectable()
export class PrismaToritoRepository implements ToritoRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findPieceByCode(code: string): Promise<ToritoPiece | null> {
    const record = await this.prisma.productPiece.findUnique({
      where: { code },
      include: pieceInclude,
    });
    return record ? toPiece(record) : null;
  }

  async saveGift(pieceId: string, gift: GiftNote, now: Date): Promise<void> {
    await this.prisma.productPiece.update({
      where: { id: pieceId },
      data: {
        giftFrom: gift.from,
        giftTo: gift.to,
        giftMessage: gift.message,
        giftUpdatedAt: now,
      },
    });
  }

  async claim(pieceId: string, customerId: string, draft: ToritoDraft): Promise<Torito> {
    try {
      return toTorito(
        await this.prisma.torito.create({
          data: {
            pieceId,
            customerId,
            name: draft.name,
            colorCode: draft.color,
            intention: draft.intention,
          },
          include: toritoInclude,
        }),
      );
    } catch (error) {
      // `pieceId` es único: si dos reclaman a la vez, solo uno lo consigue.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainError('Este torito ya tiene dueño', 'torito.duplicate_claim');
      }
      throw error;
    }
  }

  async listByCustomer(customerId: string): Promise<Torito[]> {
    const records = await this.prisma.torito.findMany({
      where: { customerId },
      include: toritoInclude,
      orderBy: { claimedAt: 'asc' },
    });
    return records.map(toTorito);
  }

  async findById(id: string): Promise<Torito | null> {
    const record = await this.prisma.torito.findUnique({
      where: { id },
      include: toritoInclude,
    });
    return record ? toTorito(record) : null;
  }

  async updateIntention(id: string, intention: string | null): Promise<Torito> {
    return toTorito(
      await this.prisma.torito.update({
        where: { id },
        data: { intention },
        include: toritoInclude,
      }),
    );
  }

  async recordVisit(id: string, day: string, streak: number): Promise<void> {
    await this.prisma.torito.update({
      where: { id },
      data: { lastVisitOn: day, visitStreak: streak },
    });
  }
}
