import {
  Category,
  type CategoryRepository,
  type ImageUrlResolver,
  Money,
  Product,
  type ProductCriteria,
  type ProductRepository,
} from '@antrina/domain';
import { describe, expect, it } from 'vitest';
import { ListWorldShopUseCase } from '../src/index.js';

const category = (slug: string, name: string, parentId: string | null = null, sortOrder = 0) =>
  Category.create({
    id: slug,
    slug,
    parentId,
    sortOrder,
    content: {
      es: { name, slug, description: null },
      en: { name: `${name} EN`, slug, description: null },
    },
  });

const product = (id: string, categorySlug: string) =>
  Product.create({
    id,
    sku: id.toUpperCase(),
    categoryId: categorySlug,
    categorySlug,
    categoryContent: { es: { name: categorySlug, slug: categorySlug } },
    price: Money.ofCents(4500, 'PEN'),
    compareAtPrice: null,
    cost: null,
    stock: 3,
    lowStockThreshold: 1,
    images: [],
    status: 'ACTIVE',
    isFeatured: false,
    badge: null,
    size: null,
    intention: null,
    signs: [],
    origin: null,
    content: {
      es: { name: id, slug: id, description: '', metaTitle: null, metaDescription: null },
    },
    updatedAt: new Date(),
  });

const categories = [
  category('toritos-de-pucara', 'Toritos de Pucará', null, 2),
  category('toritos-pares', 'Pares', 'toritos-de-pucara', 1),
  category('toritos-vacios', 'Sin piezas', 'toritos-de-pucara', 2),
  category('arboles-de-cuarzo', 'Árboles de cuarzo', null, 1),
  category('arbol-mini', 'Mini', 'toritos-de-pucara', 3),
];
const products = [
  product('torito-1', 'toritos-de-pucara'),
  product('torito-par', 'toritos-pares'),
  product('arbol-1', 'arboles-de-cuarzo'),
];

/** Igual que el adapter de Prisma: el filtro por categoría incluye sus subcategorías. */
function setup() {
  const asked: ProductCriteria[] = [];
  const productRepo = {
    findMany: async (criteria: ProductCriteria) => {
      asked.push(criteria);
      const parent = categories.find((c) => c.slug === criteria.categorySlug);
      return products.filter((p) => {
        const own = categories.find((c) => c.slug === p.categorySlug)!;
        return own.slug === criteria.categorySlug || own.parentId === parent?.id;
      });
    },
  } as unknown as ProductRepository;
  const categoryRepo = {
    findAllWithCounts: async () =>
      categories.map((c) => ({
        category: c,
        productCount: 0,
        activeProductCount: 0,
        childCount: 0,
      })),
  } as unknown as CategoryRepository;
  const images: ImageUrlResolver = { publicUrl: (key) => `https://media.test/${key}` };
  return { asked, useCase: new ListWorldShopUseCase(productRepo, categoryRepo, images) };
}

describe('tienda de un mundo', () => {
  it('trae lo de las categorías raíz con el prefijo y sus subcategorías', async () => {
    const { useCase } = setup();
    const shop = await useCase.execute({ prefix: 'torito', locale: 'es' });
    expect(shop.products.map((p) => p.id)).toEqual(['torito-1', 'torito-par']);
    // Solo las subcategorías con productos.
    expect(shop.subcategories).toEqual([{ slug: 'toritos-pares', name: 'Pares' }]);
  });

  it('traduce los nombres de las subcategorías', async () => {
    const { useCase } = setup();
    const shop = await useCase.execute({ prefix: 'torito', locale: 'en' });
    expect(shop.subcategories).toEqual([{ slug: 'toritos-pares', name: 'Pares EN' }]);
  });

  it('no mezcla mundos: el prefijo solo mira categorías raíz', async () => {
    const { useCase } = setup();
    const shop = await useCase.execute({ prefix: 'arbol', locale: 'es' });
    expect(shop.products.map((p) => p.id)).toEqual(['arbol-1']);
    expect(shop.subcategories).toEqual([]);
  });

  it('sin prefijo válido o sin categorías no consulta productos', async () => {
    const { asked, useCase } = setup();
    expect(await useCase.execute({ prefix: '', locale: 'es' })).toEqual({
      products: [],
      subcategories: [],
    });
    expect(await useCase.execute({ prefix: 'Robot!', locale: 'es' })).toEqual({
      products: [],
      subcategories: [],
    });
    expect(await useCase.execute({ prefix: 'textil', locale: 'es' })).toEqual({
      products: [],
      subcategories: [],
    });
    expect(asked).toEqual([]);
  });
});
