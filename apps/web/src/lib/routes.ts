import { type LocaleCode } from '@antrina/contracts';
import { LOCALES, localePath } from '../i18n/config';

/** Segmentos de URL traducidos; los slugs de cada entrada vienen traducidos de `taxonomy.ts` y `stones.ts`. */
const SEGMENTS = {
  es: {
    catalog: 'arboles',
    intention: 'intencion',
    sign: 'signo',
    size: 'tamano',
    product: 'arbol',
    item: 'producto',
    category: 'categoria',
    createTree: 'crea-tu-arbol',
    meanings: 'significados',
    corporate: 'regalos-corporativos',
    story: 'nuestra-historia',
    shipping: 'envios',
    contact: 'contacto',
    newsletter: 'newsletter',
    search: 'buscar',
    account: 'cuenta',
    cart: 'carrito',
  },
  en: {
    catalog: 'trees',
    intention: 'intention',
    sign: 'sign',
    size: 'size',
    product: 'tree',
    item: 'product',
    category: 'category',
    createTree: 'create-your-tree',
    meanings: 'meanings',
    corporate: 'corporate-gifts',
    story: 'our-story',
    shipping: 'shipping',
    contact: 'contact',
    newsletter: 'newsletter',
    search: 'search',
    account: 'account',
    cart: 'cart',
  },
} as const satisfies Record<LocaleCode, Record<string, string>>;

type Section = keyof (typeof SEGMENTS)['es'];

const page = (section: Section) => (locale: LocaleCode) =>
  localePath(locale, `/${SEGMENTS[locale][section]}`);

const collection = (section: Section) => (locale: LocaleCode, slug?: string) =>
  localePath(locale, `/${SEGMENTS[locale][section]}${slug ? `/${slug}` : ''}`);

export const routes = {
  home: (locale: LocaleCode) => localePath(locale, '/'),
  catalog: page('catalog'),
  intention: collection('intention'),
  sign: collection('sign'),
  size: collection('size'),
  product: collection('product'),
  item: collection('item'),
  category: collection('category'),
  meanings: collection('meanings'),
  createTree: page('createTree'),
  corporate: page('corporate'),
  story: page('story'),
  shipping: page('shipping'),
  contact: page('contact'),
  newsletter: page('newsletter'),
  search: page('search'),
  account: page('account'),
  cart: page('cart'),
};

/** Categoría de los árboles: conserva sus URLs `/arbol/` y su catálogo `/arboles`. */
export const TREES_CATEGORY_SLUG = 'arboles-de-cuarzo';

/** Ficha de un producto: `/arbol/<slug>` para los árboles, `/producto/<slug>` para lo demás. */
export function productPath(locale: LocaleCode, slug: string, categorySlug: string): string {
  return categorySlug === TREES_CATEGORY_SLUG
    ? routes.product(locale, slug)
    : routes.item(locale, slug);
}

/** Página de una categoría; la de los árboles es su catálogo. */
export function categoryPath(
  locale: LocaleCode,
  category: { slug: string; urlSlug: string },
): string {
  return category.slug === TREES_CATEGORY_SLUG
    ? routes.catalog(locale)
    : routes.category(locale, category.urlSlug);
}

/** Ruta equivalente en cada idioma, para hreflang y el selector de idioma. */
export type Alternates = Partial<Record<LocaleCode, string>>;

export function alternatesFor(build: (locale: LocaleCode) => string | null): Alternates {
  return Object.fromEntries(
    LOCALES.flatMap((locale) => {
      const path = build(locale);
      return path ? [[locale, path]] : [];
    }),
  );
}
