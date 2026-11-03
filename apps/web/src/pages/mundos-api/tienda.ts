import type { APIRoute } from 'astro';
import { CATALOG_CACHE_CONTROL, getCategories, listProducts } from '../../lib/catalog';
import { cardImage } from '../../lib/images';
import { productPath, routes } from '../../lib/routes';
import { absoluteUrl, WHATSAPP_NUMBER } from '../../lib/site';

export const prerender = false;

const LOCALE = 'es';

/** La tienda dentro de la app: el catálogo público con lo que el navegador no puede calcular. */
export const GET: APIRoute = async () => {
  const [products, categories] = await Promise.all([
    listProducts({ locale: LOCALE }),
    getCategories(LOCALE),
  ]);
  return new Response(
    JSON.stringify({
      products: products.map((product) => {
        const path = productPath(LOCALE, product.slug, product.categorySlug);
        return {
          ...product,
          image: product.imageUrl ? cardImage(product.imageUrl) : null,
          path,
          url: absoluteUrl(path),
        };
      }),
      categories: (categories ?? [])
        .filter((category) => !category.parentId)
        .map(({ slug, name }) => ({ slug, name })),
      children: (categories ?? [])
        .filter((category) => category.parentId)
        .map(({ slug, parentId }) => ({
          slug,
          parentSlug: categories?.find((category) => category.id === parentId)?.slug ?? null,
        })),
      whatsappNumber: WHATSAPP_NUMBER || null,
      contactPath: routes.contact(LOCALE),
    }),
    {
      headers: { 'content-type': 'application/json', 'cache-control': CATALOG_CACHE_CONTROL },
    },
  );
};
