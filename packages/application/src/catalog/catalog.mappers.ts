import { type CategoryDto, type ProductSummaryDto } from '@antrina/contracts';
import { type Category, type ImageUrlResolver, type Locale, type Product } from '@antrina/domain';
import { toMoneyDto } from '../shared/money.mapper.js';

export function toProductSummary(
  product: Product,
  locale: Locale,
  imageUrls: ImageUrlResolver,
): ProductSummaryDto {
  const content = product.contentFor(locale);
  const cover = product.coverImage;
  return {
    id: product.id,
    sku: product.sku,
    slug: content.slug,
    name: content.name,
    description: content.description,
    categorySlug: product.categorySlug,
    origin: product.origin,
    imageUrl: cover ? imageUrls.publicUrl(cover.storageKey) : null,
    imageAlt: cover ? (cover.alt[locale] ?? content.name) : null,
    price: toMoneyDto(product.price),
    compareAtPrice: product.compareAtPrice ? toMoneyDto(product.compareAtPrice) : null,
    discountPercent: product.discountPercent(),
    badge: product.badge,
    isPurchasable: product.isPurchasable(),
  };
}

export function toCategoryDto(category: Category, locale: Locale): CategoryDto {
  return {
    id: category.id,
    slug: category.slug,
    name: category.nameFor(locale),
    parentId: category.parentId,
  };
}
