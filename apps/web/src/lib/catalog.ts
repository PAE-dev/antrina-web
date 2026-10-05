import {
  CATALOG_ROUTES,
  type ListProductsQuery,
  type ListProductsResponse,
  type LocaleCode,
  type ProductDetailDto,
  type ProductIndexItemDto,
  type ProductIndexResponse,
  type ProductSummaryDto,
  SITE_ROUTES,
  type SiteImagesResponse,
} from '@antrina/contracts';
import { getFallbackProducts } from './fallback-products';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
/** Holgura para el arranque en frío de la API serverless. */
const TIMEOUT_MS = 8000;

/** La CDN sirve la página cacheada 60 s y la renueva en segundo plano: los cambios del panel aparecen en ~1 min. */
export const CATALOG_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=600';

class NotFoundError extends Error {}

async function getJson<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (response.status === 404) throw new NotFoundError(url.pathname);
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url.pathname}`);
  return (await response.json()) as T;
}

function warn(what: string, error: unknown): void {
  console.warn(`[catalog] ${what}: ${(error as Error).message}`);
}

export interface FeaturedProductsResult {
  products: ProductSummaryDto[];
  source: 'api' | 'fallback';
}

export async function getFeaturedProducts(
  locale: LocaleCode,
  limit = 4,
): Promise<FeaturedProductsResult> {
  try {
    const query: ListProductsQuery = { locale, featured: true, limit };
    const body = await getJson<ListProductsResponse>(CATALOG_ROUTES.products, { ...query });
    if (body.data.length === 0) throw new Error('catálogo vacío');
    return { products: body.data, source: 'api' };
  } catch (error) {
    warn('API no disponible, usando fallback', error);
    return { products: getFallbackProducts(locale).slice(0, limit), source: 'fallback' };
  }
}

/** Productos activos filtrados. Si la API falla devuelve el fallback filtrado (nunca vacío por error). */
export async function listProducts(query: ListProductsQuery): Promise<ProductSummaryDto[]> {
  try {
    const body = await getJson<ListProductsResponse>(CATALOG_ROUTES.products, { ...query });
    return body.data;
  } catch (error) {
    warn('listado no disponible, usando fallback', error);
    return getFallbackProducts(query.locale ?? 'es').filter(
      (product) =>
        (!query.category || product.categorySlug === query.category) &&
        (!query.size || product.size === query.size) &&
        (!query.sign || product.signs.includes(query.sign)),
    );
  }
}

export type ProductResult =
  { status: 'ok'; product: ProductDetailDto } | { status: 'not_found' } | { status: 'unavailable' };

export async function getProduct(locale: LocaleCode, slug: string): Promise<ProductResult> {
  try {
    const product = await getJson<ProductDetailDto>(CATALOG_ROUTES.product(slug), { locale });
    return { status: 'ok', product };
  } catch (error) {
    if (error instanceof NotFoundError) return { status: 'not_found' };
    warn('ficha no disponible', error);
    return { status: 'unavailable' };
  }
}

/** Todos los productos activos (sitemap y feed de Google). `null` si la API no responde. */
export async function getProductIndex(): Promise<ProductIndexItemDto[] | null> {
  try {
    return (await getJson<ProductIndexResponse>(CATALOG_ROUTES.productIndex)).data;
  } catch (error) {
    warn('índice no disponible', error);
    return null;
  }
}

/** Fotos editoriales subidas desde el panel (Portada). Sin API, la tienda muestra los huecos vacíos. */
export async function getSiteImages(locale: LocaleCode): Promise<SiteImagesResponse> {
  try {
    return await getJson<SiteImagesResponse>(SITE_ROUTES.images, { locale });
  } catch (error) {
    warn('fotos de portada no disponibles', error);
    return {};
  }
}
