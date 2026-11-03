import type { APIRoute } from 'astro';
import { CATALOG_CACHE_CONTROL, getCategories, listProducts } from '../../lib/catalog';
import { cardImage } from '../../lib/images';
import { productPath, routes } from '../../lib/routes';
import { absoluteUrl, WHATSAPP_NUMBER } from '../../lib/site';

export const prerender = false;

const LOCALE = 'es';

/** La tienda de un mundo: solo lo que pertenece a su categoría y a sus subcategorías. */
export const GET: APIRoute = async ({ url }) => {
  const prefix = url.searchParams.get('categoria') ?? '';
  const [products, categories] = await Promise.all([
    listProducts({ locale: LOCALE }),
    getCategories(LOCALE),
  ]);
  const all = categories ?? [];
  const roots = prefix
    ? all.filter((category) => !category.parentId && category.slug.startsWith(prefix))
    : [];
  const children = all.filter((category) => roots.some((root) => root.id === category.parentId));
  const slugs = new Set([...roots, ...children].map((category) => category.slug));
  const worldProducts = products.filter((product) => slugs.has(product.categorySlug));

  return new Response(
    JSON.stringify({
      products: worldProducts.map((product) => {
        const path = productPath(LOCALE, product.slug, product.categorySlug);
        return {
          ...product,
          image: product.imageUrl ? cardImage(product.imageUrl) : null,
          path,
          url: absoluteUrl(path),
        };
      }),
      subcategories: children
        .filter((child) => worldProducts.some((product) => product.categorySlug === child.slug))
        .map(({ slug, name }) => ({ slug, name })),
      whatsappNumber: WHATSAPP_NUMBER || null,
      contactPath: routes.contact(LOCALE),
    }),
    {
      headers: { 'content-type': 'application/json', 'cache-control': CATALOG_CACHE_CONTROL },
    },
  );
};
