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
