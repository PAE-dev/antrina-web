import { type ListResponse, type LocaleCode, type MoneyDto } from './common.js';

export type ProductBadgeCode = 'NEW' | 'CUSTOMIZABLE' | 'LIMITED_EDITION';

export type ProductSizeCode = 'MINI' | 'STANDARD' | 'LARGE' | 'SIGNATURE';

export type ProductIntentionCode =
  'abundancia' | 'amor' | 'proteccion' | 'felicidad' | 'suerte' | 'mixto';

export type ZodiacSignCode =
  | 'ARIES'
  | 'TAURUS'
  | 'GEMINI'
  | 'CANCER'
  | 'LEO'
  | 'VIRGO'
  | 'LIBRA'
  | 'SCORPIO'
  | 'SAGITTARIUS'
  | 'CAPRICORN'
  | 'AQUARIUS'
  | 'PISCES';

export interface ProductCategoryRefDto {
  name: string;
  slug: string;
}

export interface ProductSummaryDto {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  /** Slug en español: identifica la categoría en filtros. */
  categorySlug: string;
  /** Nombre y URL de la categoría en este idioma. */
  category: ProductCategoryRefDto;
  intention: ProductIntentionCode | null;
  origin: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  price: MoneyDto;
  compareAtPrice: MoneyDto | null;
  discountPercent: number | null;
  badge: ProductBadgeCode | null;
  size: ProductSizeCode | null;
  signs: ZodiacSignCode[];
  isPurchasable: boolean;
}

export interface PublicImageDto {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductDetailDto extends ProductSummaryDto {
  images: PublicImageDto[];
  metaTitle: string | null;
  metaDescription: string | null;
  /** Slug propio de cada locale traducido; si falta un locale, ese idioma usa el contenido en español. */
  slugs: Partial<Record<LocaleCode, string>>;
  updatedAt: string;
}

export interface ProductIndexContentDto {
  name: string;
  slug: string;
  description: string;
}

/** Todos los productos activos con su contenido por idioma (sitemap y feed de Google Merchant). */
export interface ProductIndexItemDto {
  id: string;
  sku: string;
  categorySlug: string;
  /** Nombre de la categoría en español. */
  categoryName: string;
  intention: ProductIntentionCode | null;
  size: ProductSizeCode | null;
  price: MoneyDto;
  compareAtPrice: MoneyDto | null;
  isPurchasable: boolean;
  imageUrls: string[];
  content: Partial<Record<LocaleCode, ProductIndexContentDto>> & { es: ProductIndexContentDto };
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  /** Slug en español: el valor del filtro `category`. */
  slug: string;
  /** Slug de la URL en este idioma. */
  urlSlug: string;
  /** Slug de la URL en cada idioma traducido. */
  slugs: Partial<Record<LocaleCode, string>>;
  name: string;
  description: string | null;
  parentId: string | null;
  /** Productos publicados asignados directamente a esta categoría. */
  productCount: number;
}

export interface ListProductsQuery {
  locale?: LocaleCode;
  category?: string;
  intention?: ProductIntentionCode;
  size?: ProductSizeCode;
  sign?: ZodiacSignCode;
  featured?: boolean;
  limit?: number;
}

export interface ListCategoriesQuery {
  locale?: LocaleCode;
}

export type ListProductsResponse = ListResponse<ProductSummaryDto>;

export type ListCategoriesResponse = ListResponse<CategoryDto>;

export type ProductIndexResponse = ListResponse<ProductIndexItemDto>;

export const CATALOG_ROUTES = {
  products: '/catalog/products',
  product: (slug: string) => `/catalog/products/${encodeURIComponent(slug)}`,
  productIndex: '/catalog/product-index',
  categories: '/catalog/categories',
} as const;
