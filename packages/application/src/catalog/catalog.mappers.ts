import {
  type CategoryDto,
  type ProductDetailDto,
  type ProductIndexItemDto,
  type ProductSummaryDto,
} from '@antrina/contracts';
import {
  type Category,
  type ImageUrlResolver,
  type Locale,
  type Product,
  type ProductContent,
} from '@antrina/domain';
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
    size: product.size,
    signs: [...product.signs],
    isPurchasable: product.isPurchasable(),
  };
}

export function toProductDetail(
  product: Product,
  locale: Locale,
  imageUrls: ImageUrlResolver,
): ProductDetailDto {
  const content = product.contentFor(locale);
  return {
    ...toProductSummary(product, locale, imageUrls),
    images: product.images.map((image) => ({
      url: imageUrls.publicUrl(image.storageKey),
      alt: image.alt[locale] ?? content.name,
      width: image.width,
      height: image.height,
    })),
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    slugs: Object.fromEntries(
      product.locales.map((code) => [code, product.content[code]?.slug ?? content.slug]),
    ),
    updatedAt: product.updatedAt.toISOString(),
  };
}

const indexContent = ({ name, slug, description }: ProductContent) => ({ name, slug, description });

export function toProductIndexItem(
  product: Product,
  imageUrls: ImageUrlResolver,
): ProductIndexItemDto {
  const translated = Object.fromEntries(
    product.locales.flatMap((code) => {
      const content = product.content[code];
      return content ? [[code, indexContent(content)]] : [];
    }),
  );
  return {
    id: product.id,
    sku: product.sku,
    categorySlug: product.categorySlug,
    size: product.size,
    price: toMoneyDto(product.price),
    isPurchasable: product.isPurchasable(),
    imageUrls: product.images.map((image) => imageUrls.publicUrl(image.storageKey)),
    content: { ...translated, es: indexContent(product.content.es) },
    updatedAt: product.updatedAt.toISOString(),
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
