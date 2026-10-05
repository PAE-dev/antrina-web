import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type ProductBadge, type ProductSize } from '../src/generated/prisma/enums.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Las categorías del catálogo son las intenciones de cada árbol. */
const categories = [
  { slug: 'abundancia', es: 'Abundancia', en: 'Abundance' },
  { slug: 'amor', es: 'Amor', en: 'Love' },
  { slug: 'proteccion', es: 'Protección', en: 'Protection' },
  { slug: 'felicidad', es: 'Felicidad', en: 'Happiness' },
  { slug: 'mixto', es: 'Mixto', en: 'Mixed' },
];

interface SeedProduct {
  sku: string;
  category: string;
  priceCents: number;
  stock: number;
  featured?: boolean;
  badge?: ProductBadge;
  /** Signos cuya piedra lleva el árbol. */
  signs: string[];
  es: { name: string; slug: string; description: string };
  en: { name: string; slug: string; description: string };
}

/** El sufijo del SKU indica el tamaño. */
const SIZE_BY_SUFFIX: Record<string, ProductSize> = {
  MIN: 'MINI',
  STD: 'STANDARD',
  GRA: 'LARGE',
  FIR: 'SIGNATURE',
};

const products: SeedProduct[] = [
  {
    sku: 'BON-CIT-STD',
    signs: ['GEMINI'],
    category: 'abundancia',
    priceCents: 28900,
    stock: 10,
    featured: true,
    es: {
      name: 'Árbol de citrino',
      slug: 'arbol-citrino',
      description: 'Citrino y pirita sobre base de cuarzo, armado a mano para atraer prosperidad.',
    },
    en: {
      name: 'Citrine tree',
      slug: 'citrine-tree',
      description: 'Citrine and pyrite on a quartz base, handcrafted to invite prosperity.',
    },
  },
  {
    sku: 'BON-ROS-STD',
    signs: ['TAURUS'],
    category: 'amor',
    priceCents: 28900,
    stock: 12,
    featured: true,
    badge: 'NEW',
    es: {
      name: 'Árbol de cuarzo rosa',
      slug: 'arbol-cuarzo-rosa',
      description: 'Cuarzo rosa natural para el amor propio y los vínculos que importan.',
    },
    en: {
      name: 'Rose quartz tree',
      slug: 'rose-quartz-tree',
      description: 'Natural rose quartz for self-love and the bonds that matter.',
    },
  },
  {
    sku: 'BON-TUR-STD',
    signs: ['CAPRICORN', 'AQUARIUS'],
    category: 'proteccion',
    priceCents: 31900,
    stock: 8,
    featured: true,
    badge: 'CUSTOMIZABLE',
    es: {
      name: 'Árbol de turmalina negra',
      slug: 'arbol-turmalina-negra',
      description: 'Turmalina negra y amatista para resguardar tu espacio y tu energía.',
    },
    en: {
      name: 'Black tourmaline tree',
      slug: 'black-tourmaline-tree',
      description: 'Black tourmaline and amethyst to guard your space and energy.',
    },
  },
  {
    sku: 'BON-CHK-FIR',
    signs: [],
    category: 'mixto',
    priceCents: 89000,
    stock: 3,
    featured: true,
    badge: 'LIMITED_EDITION',
    es: {
      name: 'Árbol siete chakras, Edición Firma',
      slug: 'arbol-siete-chakras-edicion-firma',
      description: 'Siete piedras en equilibrio sobre una base de amatista en bruto.',
    },
    en: {
      name: 'Seven chakra tree, Signature Edition',
      slug: 'seven-chakra-tree-signature-edition',
      description: 'Seven stones in balance on a raw amethyst base.',
    },
  },
  {
    sku: 'BON-COR-STD',
    signs: ['ARIES'],
    category: 'felicidad',
    priceCents: 27900,
    stock: 10,
    es: {
      name: 'Árbol de cornalina',
      slug: 'arbol-cornalina',
      description: 'Cornalina y aventurina para la alegría, la vitalidad y la calma.',
    },
    en: {
      name: 'Carnelian tree',
      slug: 'carnelian-tree',
      description: 'Carnelian and aventurine for joy, vitality and calm.',
    },
  },
  {
    sku: 'BON-AME-MIN',
    signs: ['AQUARIUS'],
    category: 'proteccion',
    priceCents: 14900,
    stock: 20,
    es: {
      name: 'Mini árbol de amatista',
      slug: 'mini-arbol-amatista',
      description: 'Formato mini para escritorios, repisas y mesas de noche.',
    },
    en: {
      name: 'Mini amethyst tree',
      slug: 'mini-amethyst-tree',
      description: 'Mini size for desks, shelves and nightstands.',
    },
  },
  {
    sku: 'BON-ROS-MIN',
    signs: ['TAURUS'],
    category: 'amor',
    priceCents: 14900,
    stock: 20,
    es: {
      name: 'Mini árbol de cuarzo rosa',
      slug: 'mini-arbol-cuarzo-rosa',
      description: 'El regalo pequeño con más intención.',
    },
    en: {
      name: 'Mini rose quartz tree',
      slug: 'mini-rose-quartz-tree',
      description: 'The small gift with the most intention.',
    },
  },
  {
    sku: 'BON-PIR-GRA',
    signs: [],
    category: 'abundancia',
    priceCents: 46900,
    stock: 5,
    badge: 'CUSTOMIZABLE',
    es: {
      name: 'Árbol grande de pirita',
      slug: 'arbol-grande-pirita',
      description: 'Pirita y citrino en formato grande, para recepciones y oficinas.',
    },
    en: {
      name: 'Large pyrite tree',
      slug: 'large-pyrite-tree',
      description: 'Pyrite and citrine in a large size, for lobbies and offices.',
    },
  },
];

async function main(): Promise<void> {
  const categoryIds = new Map<string, string>();

  for (const [index, category] of categories.entries()) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { sortOrder: index },
      create: { slug: category.slug, sortOrder: index },
    });
    categoryIds.set(category.slug, saved.id);

    for (const locale of ['es', 'en'] as const) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: saved.id, locale } },
        update: { name: category[locale] },
        create: { categoryId: saved.id, locale, name: category[locale] },
      });
    }
  }

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Categoría desconocida: ${product.category}`);

    const data = {
      categoryId,
      priceCents: product.priceCents,
      compareAtPriceCents: null,
      currency: 'PEN' as const,
      stock: product.stock,
      status: 'ACTIVE' as const,
      isFeatured: product.featured ?? false,
      badge: product.badge ?? null,
      origin: 'Taller Antrina, Lima',
      size: SIZE_BY_SUFFIX[product.sku.split('-').at(-1) ?? ''] ?? null,
      signs: product.signs,
    };

    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      update: data,
      create: { sku: product.sku, ...data },
    });

    for (const locale of ['es', 'en'] as const) {
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: saved.id, locale } },
        update: product[locale],
        create: { productId: saved.id, locale, ...product[locale] },
      });
    }
  }

  console.log(`Seed listo: ${categories.length} intenciones, ${products.length} árboles.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
