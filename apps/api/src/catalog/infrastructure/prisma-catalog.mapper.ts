import {
  Category,
  DEFAULT_LOCALE,
  DomainError,
  type ImageAlt,
  isImageContentType,
  isLocale,
  isZodiacSign,
  type Locale,
  type Localized,
  Money,
  Product,
  type ProductContent,
  type ProductImage,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';

export const productImageInclude = { translations: true } satisfies Prisma.ProductImageInclude;

export const productInclude = {
  translations: true,
  category: { select: { slug: true } },
  images: { include: productImageInclude, orderBy: { position: 'asc' } },
} satisfies Prisma.ProductInclude;

export const categoryInclude = { translations: true } satisfies Prisma.CategoryInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type CategoryRecord = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;
type ProductImageRecord = Prisma.ProductImageGetPayload<{ include: typeof productImageInclude }>;

export function toDomainProductImage(record: ProductImageRecord): ProductImage {
  const alt: ImageAlt = {};
  for (const row of record.translations) {
    if (isLocale(row.locale)) alt[row.locale] = row.alt;
  }
  return {
    id: record.id,
    storageKey: record.storageKey,
    position: record.position,
    width: record.width,
    height: record.height,
    contentType: isImageContentType(record.contentType) ? record.contentType : 'image/jpeg',
    sizeBytes: record.sizeBytes,
    alt,
  };
}

function toLocalized<T>(
  entityId: string,
  rows: Array<{ locale: string } & T>,
  pick: (row: T) => T,
): Localized<T> {
  const byLocale = new Map<Locale, T>();
  for (const row of rows) {
    if (isLocale(row.locale)) byLocale.set(row.locale, pick(row));
  }
  const fallback = byLocale.get(DEFAULT_LOCALE);
  if (!fallback) {
    throw new DomainError(
      `La entidad ${entityId} no tiene traducción en '${DEFAULT_LOCALE}'`,
      'catalog.missing_default_translation',
    );
  }
  return { ...Object.fromEntries(byLocale), [DEFAULT_LOCALE]: fallback };
}

export function toDomainProduct(record: ProductRecord): Product {
  const content = toLocalized<ProductContent>(record.id, record.translations, (row) => ({
    name: row.name,
    slug: row.slug,
    description: row.description,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
  }));

  return Product.create({
    id: record.id,
    sku: record.sku,
    categoryId: record.categoryId,
    categorySlug: record.category.slug,
    price: Money.ofCents(record.priceCents, record.currency),
    compareAtPrice:
      record.compareAtPriceCents === null
        ? null
        : Money.ofCents(record.compareAtPriceCents, record.currency),
    stock: record.stock,
    images: record.images.map(toDomainProductImage),
    status: record.status,
    isFeatured: record.isFeatured,
    badge: record.badge,
    size: record.size,
    signs: record.signs.filter(isZodiacSign),
    origin: record.origin,
    content,
    updatedAt: record.updatedAt,
  });
}

export function toDomainCategory(record: CategoryRecord): Category {
  const name = toLocalized<{ name: string }>(record.id, record.translations, (row) => ({
    name: row.name,
  }));

  return Category.create({
    id: record.id,
    slug: record.slug,
    parentId: record.parentId,
    sortOrder: record.sortOrder,
    name: Object.fromEntries(
      Object.entries(name).map(([locale, value]) => [locale, value.name]),
    ) as Localized<string>,
  });
}
