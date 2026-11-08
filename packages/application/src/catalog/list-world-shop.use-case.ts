import { type WorldShopResponse } from '@antrina/contracts';
import {
  type CategoryRepository,
  type ImageUrlResolver,
  type Locale,
  type ProductRepository,
} from '@antrina/domain';
import { toProductSummary } from './catalog.mappers.js';

export interface ListWorldShopInput {
  /** `shop.categoryPrefix` del mundo (`torito`). */
  prefix: string;
  locale: Locale;
}

/** Tope por categoría raíz: la tienda de un mundo es corta y no pagina. */
const MAX_PER_ROOT = 120;
const PREFIX = /^[a-z0-9-]{1,60}$/;

/**
 * Tienda de un mundo de `/mundos`: solo lo que pertenece a sus categorías raíz (slug con el prefijo)
 * y a sus subcategorías. Sin prefijo válido, vacía.
 */
export class ListWorldShopUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(input: ListWorldShopInput): Promise<WorldShopResponse> {
    const prefix = input.prefix.trim();
    if (!PREFIX.test(prefix)) return { products: [], subcategories: [] };

    const all = (await this.categories.findAllWithCounts())
      .map((row) => row.category)
      .toSorted((a, b) => a.sortOrder - b.sortOrder);
    const roots = all.filter((category) => !category.parentId && category.slug.startsWith(prefix));
    if (roots.length === 0) return { products: [], subcategories: [] };
    const children = all.filter((category) => roots.some((root) => root.id === category.parentId));

    // El filtro por categoría del repositorio ya incluye sus subcategorías.
    const perRoot = await Promise.all(
      roots.map((root) => this.products.findMany({ categorySlug: root.slug, limit: MAX_PER_ROOT })),
    );
    const seen = new Set<string>();
    const products = perRoot.flat().filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });

    return {
      products: products.map((product) => toProductSummary(product, input.locale, this.imageUrls)),
      subcategories: children
        .filter((child) => products.some((product) => product.categorySlug === child.slug))
        .map((child) => ({ slug: child.slug, name: child.contentFor(input.locale).name })),
    };
  }
}
