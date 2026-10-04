import { type LocaleCode } from '@antrina/contracts';
import { localePath } from '../i18n/config';

/** Segmentos de URL traducidos; los slugs de intención, signo y tamaño son los mismos en todos los idiomas. */
const SEGMENTS = {
  es: {
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
