import { type LocaleCode } from '@antrina/contracts';
import { type APIRoute } from 'astro';
import { STONES } from '../content/stones';
import { HREFLANG, LOCALES } from '../i18n/config';
import { INTENTIONS, SIGNS, SIZES } from '../i18n/taxonomy';
import { CATALOG_CACHE_CONTROL, getCategories, getProductIndex } from '../lib/catalog';
import { visibleRootCategories } from '../lib/page-data';
import {
  type Alternates,
  alternatesFor,
  productPath,
  routes,
  TREES_CATEGORY_SLUG,
} from '../lib/routes';
import { absoluteUrl } from '../lib/site';

export const prerender = false;

interface Entry {
  alternates: Alternates;
  lastmod?: string;
  images?: string[];
}

const xml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const page = (route: (locale: LocaleCode) => string): Entry => ({
  alternates: alternatesFor(route),
});

/** Una `<url>` por idioma, cada una con sus alternativas hreflang (formato recomendado por Google). */
function render(entries: Entry[]): string {
  const urls = entries.flatMap(({ alternates, lastmod, images = [] }) => {
    const links = LOCALES.flatMap((locale) => {
      const path = alternates[locale];
      return path
        ? [
            `<xhtml:link rel="alternate" hreflang="${HREFLANG[locale]}" href="${xml(absoluteUrl(path))}"/>`,
          ]
        : [];
    });
    if (alternates.es) {
      links.push(
        `<xhtml:link rel="alternate" hreflang="x-default" href="${xml(absoluteUrl(alternates.es))}"/>`,
      );
    }
    return LOCALES.flatMap((locale) => {
      const path = alternates[locale];
      if (!path) return [];
      return [
        [
          '<url>',
          `<loc>${xml(absoluteUrl(path))}</loc>`,
          lastmod ? `<lastmod>${lastmod}</lastmod>` : '',
          ...links,
          ...images.map((url) => `<image:image><image:loc>${xml(url)}</image:loc></image:image>`),
          '</url>',
        ].join(''),
      ];
    });
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    '</urlset>',
  ].join('\n');
}

export const GET: APIRoute = async () => {
  const [products, categories] = await Promise.all([getProductIndex(), getCategories('es')]);
  const visibleRoots = visibleRootCategories(categories ?? []);
  /** Principales con productos y subcategorías con productos; los árboles ya están en `catalog`. */
  const categoryPages = (categories ?? []).filter(
    (category) =>
      category.slug !== TREES_CATEGORY_SLUG &&
      (visibleRoots.some((root) => root.id === category.id) || category.productCount > 0),
  );
  const entries: Entry[] = [
    ...(categoryPages.length > 0 ? [page((locale) => routes.category(locale))] : []),
    ...categoryPages.map((category) => ({
      alternates: alternatesFor((locale) => {
        const slug = category.slugs[locale];
        return slug ? routes.category(locale, slug) : null;
      }),
    })),
    page(routes.home),
    page(routes.catalog),
    page(routes.sky),
    page(routes.ranking),
    page((locale) => routes.intention(locale)),
    ...INTENTIONS.map((entry) => page((locale) => routes.intention(locale, entry.slug[locale]))),
    page((locale) => routes.sign(locale)),
    ...SIGNS.map((entry) => page((locale) => routes.sign(locale, entry.slug[locale]))),
    page((locale) => routes.size(locale)),
    ...SIZES.map((entry) => page((locale) => routes.size(locale, entry.slug[locale]))),
    page((locale) => routes.meanings(locale)),
    ...STONES.map((stone) => page((locale) => routes.meanings(locale, stone.slug[locale]))),
    page(routes.createTree),
    page(routes.corporate),
    page(routes.story),
    page(routes.shipping),
    page(routes.contact),
    ...(products ?? []).map((product) => ({
      alternates: alternatesFor((locale) => {
        const content = product.content[locale];
        return content ? productPath(locale, content.slug, product.categorySlug) : null;
      }),
      lastmod: product.updatedAt,
      images: product.imageUrls,
    })),
  ];
  return new Response(render(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Sin API se publica el sitemap sin productos, pero solo un minuto.
      'Cache-Control': products ? CATALOG_CACHE_CONTROL : 'public, s-maxage=60',
    },
  });
};
