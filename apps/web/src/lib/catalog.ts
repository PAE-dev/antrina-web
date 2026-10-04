import {
  CATALOG_ROUTES,
  type ListProductsQuery,
  type ListProductsResponse,
  type LocaleCode,
  type ProductSummaryDto,
} from '@antrina/contracts';
import { getFallbackProducts } from './fallback-products';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = 2500;

export interface FeaturedProductsResult {
  products: ProductSummaryDto[];
  source: 'api' | 'fallback';
}

export async function getFeaturedProducts(
  locale: LocaleCode,
  limit = 4,
): Promise<FeaturedProductsResult> {
  const query: ListProductsQuery = { locale, featured: true, limit };
  const url = new URL(CATALOG_ROUTES.products, API_URL);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as ListProductsResponse;
    if (body.data.length === 0) throw new Error('catálogo vacío');
    return { products: body.data, source: 'api' };
  } catch (error) {
    console.warn(
      `[catalog] API no disponible en ${url.origin}, usando fallback:`,
      (error as Error).message,
    );
    return { products: getFallbackProducts(locale).slice(0, limit), source: 'fallback' };
  }
}
