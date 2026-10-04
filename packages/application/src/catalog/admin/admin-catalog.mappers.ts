import {
  type AdminCategoryDto,
  type AdminProductDto,
  type AdminProductListItemDto,
  type ProductImageDto,
} from '@antrina/contracts';
import {
  type Category,
  DEFAULT_LOCALE,
  type ImageUrlResolver,
  type Product,
  type ProductImage,
} from '@antrina/domain';
import { toMoneyDto } from '../../shared/money.mapper.js';

export function toProductImageDto(
  image: ProductImage,
  imageUrls: ImageUrlResolver,
): ProductImageDto {
  return {
    id: image.id,
    url: imageUrls.publicUrl(image.storageKey),
    position: image.position,
    width: image.width,
    height: image.height,
    alt: { ...image.alt },
  };
}

export function toAdminProductListItem(
  product: Product,
  imageUrls: ImageUrlResolver,
): AdminProductListItemDto {
  const cover = product.coverImage;
  return {
    id: product.id,
    sku: product.sku,
    name: product.contentFor(DEFAULT_LOCALE).name,
    categorySlug: product.categorySlug,
    status: product.status,
    price: toMoneyDto(product.price),
    stock: product.stock,
    isFeatured: product.isFeatured,
    badge: product.badge,
    coverUrl: cover ? imageUrls.publicUrl(cover.storageKey) : null,
    imageCount: product.images.length,
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toAdminProductDto(product: Product, imageUrls: ImageUrlResolver): AdminProductDto {
  return {
    id: product.id,
    sku: product.sku,
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    price: toMoneyDto(product.price),
    stock: product.stock,
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge,
    origin: product.origin,
    content: {
      es: { ...product.content.es },
      en: product.content.en ? { ...product.content.en } : null,
    },
    images: product.images.map((image) => toProductImageDto(image, imageUrls)),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toAdminCategoryDto(category: Category): AdminCategoryDto {
  return { id: category.id, slug: category.slug, name: category.nameFor(DEFAULT_LOCALE) };
}
