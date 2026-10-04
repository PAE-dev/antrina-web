import { Inject, Injectable } from '@nestjs/common';
import {
  type AdminProductCriteria,
  DomainError,
  type Product,
  type ProductCriteria,
  type ProductDraft,
  type ProductPage,
  type ProductRepository,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { productInclude, toDomainProduct } from './prisma-catalog.mapper.js';

function translationRows(draft: ProductDraft) {
  return Object.entries(draft.content).flatMap(([locale, content]) =>
    content
      ? [
          {
            locale,
            name: content.name.trim(),
            slug: content.slug,
            description: content.description,
          },
        ]
      : [],
  );
}

function scalarData(draft: ProductDraft) {
  return {
    sku: draft.sku,
    categoryId: draft.categoryId,
    priceCents: draft.price.amountInCents,
    currency: draft.price.currency,
    stock: draft.stock,
    status: draft.status,
    isFeatured: draft.isFeatured,
    badge: draft.badge,
    origin: draft.origin,
  };
}

/** Traduce violaciones de restricciones de Postgres a errores de dominio. */
function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const detail = JSON.stringify(error.meta ?? {});
    if (error.code === 'P2002') {
      if (detail.includes('sku')) {
        throw new DomainError('Ya existe un producto con ese SKU', 'product.duplicate_sku');
      }
      throw new DomainError('Ya existe un producto con ese slug', 'product.duplicate_slug');
    }
    if (error.code === 'P2003') {
      throw new DomainError('La intención (categoría) no existe', 'product.invalid_category');
    }
    if (error.code === 'P2025') {
      throw new DomainError('Producto no encontrado', 'product.not_found');
    }
  }
  throw error;
}

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(criteria: ProductCriteria): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        ...(criteria.featuredOnly ? { isFeatured: true } : {}),
        ...(criteria.categorySlug ? { category: { slug: criteria.categorySlug } } : {}),
      },
      include: productInclude,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'asc' }],
      ...(criteria.limit ? { take: criteria.limit } : {}),
    });
    return records.map(toDomainProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    return record ? toDomainProduct(record) : null;
  }

  async findManyForAdmin(criteria: AdminProductCriteria): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.query
        ? {
            OR: [
              { sku: { contains: criteria.query, mode: 'insensitive' } },
              {
                translations: { some: { name: { contains: criteria.query, mode: 'insensitive' } } },
              },
            ],
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: records.map(toDomainProduct), total };
  }

  async create(draft: ProductDraft): Promise<Product> {
    try {
      const record = await this.prisma.product.create({
        data: { ...scalarData(draft), translations: { create: translationRows(draft) } },
        include: productInclude,
      });
      return toDomainProduct(record);
    } catch (error) {
      translateWriteError(error);
    }
  }

  async update(id: string, draft: ProductDraft): Promise<Product> {
    const rows = translationRows(draft);
    try {
      const record = await this.prisma.product.update({
        where: { id },
        data: {
          ...scalarData(draft),
          translations: {
            deleteMany: { locale: { notIn: rows.map((row) => row.locale) } },
            upsert: rows.map((row) => ({
              where: { productId_locale: { productId: id, locale: row.locale } },
              create: row,
              update: { name: row.name, slug: row.slug, description: row.description },
            })),
          },
        },
        include: productInclude,
      });
      return toDomainProduct(record);
    } catch (error) {
      translateWriteError(error);
    }
  }
}
