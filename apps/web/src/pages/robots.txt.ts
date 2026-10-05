import { type APIRoute } from 'astro';
import { LOCALES } from '../i18n/config';
import { routes } from '../lib/routes';
import { absoluteUrl } from '../lib/site';

/** Páginas sin valor para buscadores: búsqueda interna, carrito y cuenta. */
const PRIVATE = [routes.search, routes.cart, routes.account];

export const GET: APIRoute = () => {
  const disallow = LOCALES.flatMap((locale) =>
    PRIVATE.map((route) => `Disallow: ${route(locale)}`),
  );
  const body = [
    'User-agent: *',
    'Allow: /',
    ...disallow,
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
