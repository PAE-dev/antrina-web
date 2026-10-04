import { type ListResponse, type LocaleCode, type MoneyDto } from './common.js';

export type ProductBadgeCode = 'NEW' | 'CUSTOMIZABLE' | 'LIMITED_EDITION';

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
  isPurchasable: boolean;
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
  featured?: boolean;
  limit?: number;
}

export interface ListCategoriesQuery {
  locale?: LocaleCode;
}

export type ListProductsResponse = ListResponse<ProductSummaryDto>;

export type ListCategoriesResponse = ListResponse<CategoryDto>;

export const CATALOG_ROUTES = {
  products: '/catalog/products',
  categories: '/catalog/categories',
} as const;
