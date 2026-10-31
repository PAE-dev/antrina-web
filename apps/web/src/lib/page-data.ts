import { type CategoryDto, type LocaleCode, type ProductIntentionCode } from '@antrina/contracts';
import { findStoneBySlug } from '../content/stones';
import { findIntentionBySlug, findSignBySlug, findSizeBySlug } from '../i18n/taxonomy';
import { getCategories, getProduct, listProducts } from './catalog';

/** Datos de cada página con slug; `null` si el slug no existe (la página responde 404). */

export async function loadIntention(locale: LocaleCode, slug = '') {
  const entry = findIntentionBySlug(locale, slug);
  if (!entry) return null;
  const intention = entry.category as ProductIntentionCode;
  return { entry, products: await listProducts({ locale, intention }) };
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
  const intention = stone.intention as ProductIntentionCode;
  const products = await listProducts({ locale, intention, limit: 4 });
  return { stone, products };
}

const RELATED_LIMIT = 4;

export async function loadProduct(locale: LocaleCode, slug = '') {
  const result = await getProduct(locale, slug);
  if (result.status !== 'ok') return result;
  const { product } = result;
  const similar = await listProducts({
    locale,
    ...(product.intention ? { intention: product.intention } : { category: product.categorySlug }),
    limit: RELATED_LIMIT + 1,
  });
  const related = similar.filter((item) => item.id !== product.id).slice(0, RELATED_LIMIT);
  return { status: 'ok' as const, product, related };
}

/** Una categoría es visible en la tienda si ella o sus subcategorías tienen productos publicados. */
export function visibleRootCategories(categories: CategoryDto[]): CategoryDto[] {
  return categories.filter(
    (category) =>
      !category.parentId &&
      (category.productCount > 0 ||
        categories.some((child) => child.parentId === category.id && child.productCount > 0)),
  );
}

export type CategoryResult =
  | {
      status: 'ok';
      category: CategoryDto;
      parent: CategoryDto | undefined;
      /** Subcategorías con productos: las de esta categoría o, en una subcategoría, sus hermanas. */
      siblings: CategoryDto[];
      products: Awaited<ReturnType<typeof listProducts>>;
    }
  | { status: 'not_found' }
  | { status: 'unavailable' };

export async function loadCategory(locale: LocaleCode, slug = ''): Promise<CategoryResult> {
  const categories = await getCategories(locale);
  if (!categories) return { status: 'unavailable' };
  const category = categories.find((item) => item.urlSlug === slug);
  if (!category) return { status: 'not_found' };
  const parent = categories.find((item) => item.id === category.parentId);
  const siblings = categories.filter(
    (item) => item.parentId === (parent?.id ?? category.id) && item.productCount > 0,
  );
  const products = await listProducts({ locale, category: category.slug });
  return { status: 'ok', category, parent, siblings, products };
}
