import {
  CATALOG_ROUTES,
  type ListProductsQuery,
  type ListProductsResponse,
  type LocaleCode,
  type ProductSummaryDto,
} from '@antrina/contracts';
import { getFallbackProducts } from './fallback-products';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
/** Holgura para el arranque en frío de la API serverless. */
const TIMEOUT_MS = 8000;

/** La CDN sirve la página cacheada 60 s y la renueva en segundo plano: los cambios del panel aparecen en ~1 min. */
export const CATALOG_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=600';

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
