import type { APIRoute } from 'astro';
import { CATALOG_CACHE_CONTROL, getWorldShop } from '../../lib/catalog';
import { cardImage } from '../../lib/images';
import { productPath, routes } from '../../lib/routes';
import { absoluteUrl, WHATSAPP_NUMBER } from '../../lib/site';

export const prerender = false;

const LOCALE = 'es';

/**
 * La tienda de un mundo: la API filtra por categoría (`GET /catalog/world-shop`, la misma que usa
 * la app móvil) y aquí se añaden lo propio de la tienda (fotos optimizadas, rutas y WhatsApp).
 */
export const GET: APIRoute = async ({ url }) => {
  const prefix = url.searchParams.get('categoria') ?? '';
  const shop = await getWorldShop(prefix, LOCALE);
  if (!shop) {
    return new Response(JSON.stringify({ message: 'Catálogo no disponible' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  return new Response(
    JSON.stringify({
      products: shop.products.map((product) => {
        const path = productPath(LOCALE, product.slug, product.categorySlug);
        return {
          ...product,
          image: product.imageUrl ? cardImage(product.imageUrl) : null,
          path,
          url: absoluteUrl(path),
        };
      }),
      subcategories: shop.subcategories,
      whatsappNumber: WHATSAPP_NUMBER || null,
      contactPath: routes.contact(LOCALE),
    }),
    {
      headers: { 'content-type': 'application/json', 'cache-control': CATALOG_CACHE_CONTROL },
    },
  );
};
