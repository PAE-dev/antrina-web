import { type LocaleCode, type ProductSummaryDto } from '@antrina/contracts';

type FallbackSeed = Omit<ProductSummaryDto, 'name' | 'slug' | 'description'> & {
  copy: Record<LocaleCode, Pick<ProductSummaryDto, 'name' | 'slug' | 'description'>>;
};

const ORIGIN = 'Taller Antrina, Lima';

/** Se muestra solo si la API no responde, para que la landing nunca quede vacía. */
const SEED: FallbackSeed[] = [
  {
    id: 'fallback-1',
    sku: 'BON-CIT-STD',
    categorySlug: 'abundancia',
    origin: ORIGIN,
    imageUrl: null,
    imageAlt: null,
    price: { amount: 28900, currency: 'PEN' },
    compareAtPrice: null,
    discountPercent: null,
    badge: null,
    isPurchasable: true,
    copy: {
      es: { name: 'Árbol de citrino', slug: 'arbol-citrino', description: '' },
      en: { name: 'Citrine tree', slug: 'citrine-tree', description: '' },
    },
  },
  {
    id: 'fallback-2',
    sku: 'BON-ROS-STD',
    categorySlug: 'amor',
    origin: ORIGIN,
    imageUrl: null,
    imageAlt: null,
    price: { amount: 28900, currency: 'PEN' },
    compareAtPrice: null,
    discountPercent: null,
    badge: 'NEW',
    isPurchasable: true,
    copy: {
      es: { name: 'Árbol de cuarzo rosa', slug: 'arbol-cuarzo-rosa', description: '' },
      en: { name: 'Rose quartz tree', slug: 'rose-quartz-tree', description: '' },
    },
  },
  {
    id: 'fallback-3',
    sku: 'BON-TUR-STD',
    categorySlug: 'proteccion',
    origin: ORIGIN,
    imageUrl: null,
    imageAlt: null,
    price: { amount: 31900, currency: 'PEN' },
    compareAtPrice: null,
    discountPercent: null,
    badge: 'CUSTOMIZABLE',
    isPurchasable: true,
    copy: {
      es: { name: 'Árbol de turmalina negra', slug: 'arbol-turmalina-negra', description: '' },
      en: { name: 'Black tourmaline tree', slug: 'black-tourmaline-tree', description: '' },
    },
  },
  {
    id: 'fallback-4',
    sku: 'BON-CHK-FIR',
    categorySlug: 'mixto',
    origin: ORIGIN,
    imageUrl: null,
    imageAlt: null,
    price: { amount: 89000, currency: 'PEN' },
    compareAtPrice: null,
    discountPercent: null,
    badge: 'LIMITED_EDITION',
    isPurchasable: true,
    copy: {
      es: {
        name: 'Árbol siete chakras, Edición Firma',
        slug: 'arbol-siete-chakras-edicion-firma',
        description: '',
      },
      en: {
        name: 'Seven chakra tree, Signature Edition',
        slug: 'seven-chakra-tree-signature-edition',
        description: '',
      },
    },
  },
];

export function getFallbackProducts(locale: LocaleCode): ProductSummaryDto[] {
  return SEED.map(({ copy, ...product }) => ({ ...product, ...copy[locale] }));
}
