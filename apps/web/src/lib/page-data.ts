import { type LocaleCode } from '@antrina/contracts';
import { findStoneBySlug } from '../content/stones';
import { findIntentionBySlug, findSignBySlug, findSizeBySlug } from '../i18n/taxonomy';
import { getProduct, listProducts } from './catalog';

/** Datos de cada página con slug; `null` si el slug no existe (la página responde 404). */

export async function loadIntention(locale: LocaleCode, slug = '') {
  const entry = findIntentionBySlug(locale, slug);
  if (!entry) return null;
  return { entry, products: await listProducts({ locale, category: entry.category }) };
}

export async function loadSign(locale: LocaleCode, slug = '') {
  const entry = findSignBySlug(locale, slug);
  if (!entry) return null;
  return { entry, products: await listProducts({ locale, sign: entry.code }) };
}

export async function loadSize(locale: LocaleCode, slug = '') {
  const entry = findSizeBySlug(locale, slug);
  if (!entry) return null;
  return { entry, products: await listProducts({ locale, size: entry.code }) };
}

export async function loadStone(locale: LocaleCode, slug = '') {
  const stone = findStoneBySlug(locale, slug);
  if (!stone) return null;
  const products = await listProducts({ locale, category: stone.intention, limit: 4 });
  return { stone, products };
}

const RELATED_LIMIT = 4;

export async function loadProduct(locale: LocaleCode, slug = '') {
  const result = await getProduct(locale, slug);
  if (result.status !== 'ok') return result;
  const { product } = result;
  const sameIntention = await listProducts({
    locale,
    category: product.categorySlug,
    limit: RELATED_LIMIT + 1,
  });
  const related = sameIntention.filter((item) => item.id !== product.id).slice(0, RELATED_LIMIT);
  return { status: 'ok' as const, product, related };
}
