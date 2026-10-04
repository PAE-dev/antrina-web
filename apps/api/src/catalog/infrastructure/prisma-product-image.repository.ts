import { Inject, Injectable } from '@nestjs/common';
import {
  type ImageAlt,
  type NewProductImage,
  type ProductImage,
  type ProductImageRepository,
  type StoredProductImage,
} from '@antrina/domain';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { productImageInclude, toDomainProductImage } from './prisma-catalog.mapper.js';

function altRows(alt: ImageAlt) {
  return Object.entries(alt).flatMap(([locale, text]) => (text ? [{ locale, alt: text }] : []));
}

@Injectable()
export class PrismaProductImageRepository implements ProductImageRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async add(productId: string, image: NewProductImage): Promise<ProductImage> {
    const record = await this.prisma.$transaction(async (tx) => {
      const last = await tx.productImage.aggregate({
        where: { productId },
        _max: { position: true },
      });
      return tx.productImage.create({
        data: {
          productId,
          storageKey: image.storageKey,
          position: (last._max.position ?? -1) + 1,
          width: image.width,
          height: image.height,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          translations: { create: altRows(image.alt) },
        },
        include: productImageInclude,
      });
    });
    await this.touchProduct(productId);
    return toDomainProductImage(record);
  }

  async findById(id: string): Promise<StoredProductImage | null> {
    const record = await this.prisma.productImage.findUnique({
      where: { id },
      include: productImageInclude,
    });
    return record ? { productId: record.productId, image: toDomainProductImage(record) } : null;
  }

  async listByProduct(productId: string): Promise<ProductImage[]> {
    const records = await this.prisma.productImage.findMany({
      where: { productId },
      include: productImageInclude,
      orderBy: { position: 'asc' },
    });
    return records.map(toDomainProductImage);
  }

  async reorder(productId: string, orderedIds: string[]): Promise<ProductImage[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, position) =>
        this.prisma.productImage.update({ where: { id, productId }, data: { position } }),
      ),
    );
    await this.touchProduct(productId);
    return this.listByProduct(productId);
  }

  async updateAlt(id: string, alt: ImageAlt): Promise<ProductImage> {
    const rows = altRows(alt);
    const record = await this.prisma.productImage.update({
      where: { id },
      data: {
        translations: {
          deleteMany: { locale: { notIn: rows.map((row) => row.locale) } },
          upsert: rows.map((row) => ({
            where: { imageId_locale: { imageId: id, locale: row.locale } },
            create: row,
            update: { alt: row.alt },
          })),
        },
      },
      include: productImageInclude,
    });
    await this.touchProduct(record.productId);
    return toDomainProductImage(record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.prisma.productImage.delete({ where: { id } });
    await this.touchProduct(record.productId);
  }

  /** La portada forma parte del producto: su `updatedAt` refleja cambios en la galería. */
  private async touchProduct(productId: string): Promise<void> {
    await this.prisma.product.update({ where: { id: productId }, data: { updatedAt: new Date() } });
  }
}
