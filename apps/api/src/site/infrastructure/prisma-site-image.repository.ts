import { Inject, Injectable } from '@nestjs/common';
import {
  type ImageAlt,
  isImageContentType,
  isLocale,
  isSiteImageSlot,
  type NewSiteImage,
  type SiteImage,
  type SiteImageRepository,
  type SiteImageSlot,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

const include = { translations: true } satisfies Prisma.SiteImageInclude;

type SiteImageRecord = Prisma.SiteImageGetPayload<{ include: typeof include }>;

function altRows(alt: ImageAlt) {
  return Object.entries(alt).flatMap(([locale, text]) => (text ? [{ locale, alt: text }] : []));
}

function toDomain(record: SiteImageRecord): SiteImage | null {
  if (!isSiteImageSlot(record.slot)) return null;
  const alt: ImageAlt = {};
  for (const row of record.translations) {
    if (isLocale(row.locale)) alt[row.locale] = row.alt;
  }
  return {
    slot: record.slot,
    storageKey: record.storageKey,
    width: record.width,
    height: record.height,
    contentType: isImageContentType(record.contentType) ? record.contentType : 'image/jpeg',
    sizeBytes: record.sizeBytes,
    alt,
    updatedAt: record.updatedAt,
  };
}

function required(record: SiteImageRecord): SiteImage {
  const image = toDomain(record);
  if (!image) throw new Error(`Hueco de foto desconocido: ${record.slot}`);
  return image;
}

@Injectable()
export class PrismaSiteImageRepository implements SiteImageRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<SiteImage[]> {
    const records = await this.prisma.siteImage.findMany({ include });
    return records.flatMap((record) => toDomain(record) ?? []);
  }

  async findBySlot(slot: SiteImageSlot): Promise<SiteImage | null> {
    const record = await this.prisma.siteImage.findUnique({ where: { slot }, include });
    return record ? toDomain(record) : null;
  }

  async replace(image: NewSiteImage): Promise<SiteImage> {
    const data = {
      storageKey: image.storageKey,
      width: image.width,
      height: image.height,
      contentType: image.contentType,
      sizeBytes: image.sizeBytes,
    };
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.siteImage.deleteMany({ where: { slot: image.slot } });
      return tx.siteImage.create({
        data: { slot: image.slot, ...data, translations: { create: altRows(image.alt) } },
        include,
      });
    });
    return required(record);
  }

  async updateAlt(slot: SiteImageSlot, alt: ImageAlt): Promise<SiteImage> {
    const rows = altRows(alt);
    const current = await this.prisma.siteImage.findUniqueOrThrow({ where: { slot } });
    const record = await this.prisma.siteImage.update({
      where: { slot },
      data: {
        translations: {
          deleteMany: { locale: { notIn: rows.map((row) => row.locale) } },
          upsert: rows.map((row) => ({
            where: { imageId_locale: { imageId: current.id, locale: row.locale } },
            create: row,
            update: { alt: row.alt },
          })),
        },
      },
      include,
    });
    return required(record);
  }

  async delete(slot: SiteImageSlot): Promise<void> {
    await this.prisma.siteImage.deleteMany({ where: { slot } });
  }
}
