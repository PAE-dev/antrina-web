import { type ListResponse, type LocaleCode, type MoneyDto } from './common.js';

export type ProductBadgeCode = 'NEW' | 'CUSTOMIZABLE' | 'LIMITED_EDITION';

export type ProductSizeCode = 'MINI' | 'STANDARD' | 'LARGE' | 'SIGNATURE';

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

export interface ProductSummaryDto {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
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
  size: ProductSizeCode | null;
  price: MoneyDto;
  isPurchasable: boolean;
  imageUrls: string[];
  content: Partial<Record<LocaleCode, ProductIndexContentDto>> & { es: ProductIndexContentDto };
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface ListProductsQuery {
  locale?: LocaleCode;
  category?: string;
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
