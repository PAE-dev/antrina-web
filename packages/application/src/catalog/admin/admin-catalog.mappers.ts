import {
  type AdminCategoryDto,
  type AdminProductDto,
  type AdminProductListItemDto,
  type ProductImageDto,
} from '@antrina/contracts';
import {
  type CategoryContent,
  type CategoryWithCounts,
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
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    status: product.status,
    price: toMoneyDto(product.price),
    compareAtPrice: product.compareAtPrice ? toMoneyDto(product.compareAtPrice) : null,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    isLowStock: product.isLowStock(),
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
    compareAtPrice: product.compareAtPrice ? toMoneyDto(product.compareAtPrice) : null,
    cost: product.cost ? toMoneyDto(product.cost) : null,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge,
    size: product.size,
    intention: product.intention,
    signs: [...product.signs],
    stones: [...product.stones],
    origin: product.origin,
    content: {
      es: { ...product.content.es },
      en: product.content.en ? { ...product.content.en } : null,
    },
    images: product.images.map((image) => toProductImageDto(image, imageUrls)),
    updatedAt: product.updatedAt.toISOString(),
  };
}

const categoryContent = (content: CategoryContent) => ({ ...content });

export function toAdminCategoryDto({
  category,
  productCount,
  childCount,
}: CategoryWithCounts): AdminCategoryDto {
  const { es, en } = category.content;
  return {
    id: category.id,
    slug: category.slug,
    name: category.nameFor(DEFAULT_LOCALE),
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    productCount,
    childCount,
    content: { es: categoryContent(es), en: en ? categoryContent(en) : null },
  };
}
