import { type ProductBadgeCode, type ProductSizeCode, type ZodiacSignCode } from './catalog.js';
import { type CurrencyCode, type LocaleCode, type MoneyDto } from './common.js';

export type ProductStatusCode = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ImageContentTypeCode = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ProductContentDto {
  name: string;
  slug: string;
  description: string;
  /** Título para Google; null = se usa el nombre. */
  metaTitle: string | null;
  /** Descripción para Google; null = se usa la descripción. */
  metaDescription: string | null;
}

/** El español es obligatorio; el inglés es opcional mientras no se traduzca. */
export interface ProductContentByLocaleDto {
  es: ProductContentDto;
  en: ProductContentDto | null;
}

export type ImageAltDto = Partial<Record<LocaleCode, string>>;

export interface ProductImageDto {
  id: string;
  url: string;
  position: number;
  width: number;
  height: number;
  alt: ImageAltDto;
}

export interface AdminProductListItemDto {
  id: string;
  sku: string;
  name: string;
  categorySlug: string;
  status: ProductStatusCode;
  price: MoneyDto;
  stock: number;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  coverUrl: string | null;
  imageCount: number;
  updatedAt: string;
}

export interface AdminProductDto {
  id: string;
  sku: string;
  categoryId: string;
  categorySlug: string;
  price: MoneyDto;
  stock: number;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  size: ProductSizeCode | null;
  signs: ZodiacSignCode[];
  origin: string | null;
  content: ProductContentByLocaleDto;
  images: ProductImageDto[];
  updatedAt: string;
}

export interface AdminProductListQuery {
  q?: string;
  status?: ProductStatusCode;
  page?: number;
  pageSize?: number;
}

export interface AdminProductListResponse {
  data: AdminProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpsertProductRequest {
  sku: string;
  categoryId: string;
  /** Céntimos. */
  priceCents: number;
  currency: CurrencyCode;
  stock: number;
  status: ProductStatusCode;
  isFeatured: boolean;
  badge: ProductBadgeCode | null;
  size: ProductSizeCode | null;
  signs: ZodiacSignCode[];
  origin: string | null;
  content: ProductContentByLocaleDto;
}

export interface ImageUploadRequest {
  contentType: ImageContentTypeCode;
  sizeBytes: number;
}

export interface ImageUploadTargetDto {
  storageKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface AddProductImageRequest {
  storageKey: string;
  width: number;
  height: number;
  alt: ImageAltDto;
}

export interface ReorderProductImagesRequest {
  imageIds: string[];
}

export interface UpdateProductImageAltRequest {
  alt: ImageAltDto;
}

export interface AdminCategoryDto {
  id: string;
  slug: string;
  name: string;
}

export const ADMIN_CATALOG_ROUTES = {
  products: '/admin/products',
  product: (id: string) => `/admin/products/${id}`,
  archiveProduct: (id: string) => `/admin/products/${id}/archive`,
  imageUploadUrl: (id: string) => `/admin/products/${id}/images/upload-url`,
  images: (id: string) => `/admin/products/${id}/images`,
  imagesOrder: (id: string) => `/admin/products/${id}/images/order`,
  image: (id: string, imageId: string) => `/admin/products/${id}/images/${imageId}`,
  categories: '/admin/categories',
} as const;
