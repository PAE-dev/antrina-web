import { type LocaleCode } from '@antrina/contracts';

/**
 * Taxonomía de la tienda (intenciones, signos, tamaños). El `slug` es estable y compartido
 * por todos los idiomas; las intenciones coinciden con los slugs de categoría de la API.
 */
type Localized<T> = Record<LocaleCode, T>;

export interface IntentionEntry {
  slug: string;
  copy: Localized<{ label: string; stones: string; text: string }>;
}

export interface SignEntry {
  slug: string;
  copy: Localized<{ label: string; dates: string; stone: string }>;
}

export interface SizeEntry {
  slug: string;
  copy: Localized<{ label: string }>;
}

export const INTENTIONS: IntentionEntry[] = [
  {
    slug: 'abundancia',
    copy: {
      es: {
        label: 'Abundancia',
        stones: 'Citrino · Pirita',
        text: 'Para abrir caminos y atraer prosperidad a tu casa o negocio.',
      },
      en: {
        label: 'Abundance',
        stones: 'Citrine · Pyrite',
        text: 'To open new paths and invite prosperity into your home or business.',
      },
    },
  },
  {
    slug: 'amor',
    copy: {
      es: {
        label: 'Amor',
        stones: 'Cuarzo rosa · Rodonita',
        text: 'Para cultivar el amor propio y los vínculos que te sostienen.',
      },
      en: {
        label: 'Love',
        stones: 'Rose quartz · Rhodonite',
        text: 'To nurture self-love and the bonds that hold you.',
      },
    },
  },
  {
    slug: 'proteccion',
    copy: {
      es: {
        label: 'Protección',
        stones: 'Turmalina negra · Amatista',
        text: 'Para resguardar tu espacio y tu energía de lo que no suma.',
      },
      en: {
        label: 'Protection',
        stones: 'Black tourmaline · Amethyst',
        text: 'To shelter your space and your energy from what does not serve you.',
      },
    },
  },
  {
    slug: 'felicidad',
    copy: {
      es: {
        label: 'Felicidad',
        stones: 'Cornalina · Ojo de tigre',
        text: 'Para encender la alegría, la creatividad y las ganas de empezar.',
      },
      en: {
        label: 'Happiness',
        stones: 'Carnelian · Tiger’s eye',
        text: 'To spark joy, creativity and the courage to begin.',
      },
    },
  },
  {
    slug: 'mixto',
    copy: {
      es: {
        label: 'Mixto',
        stones: 'Siete chakras',
        text: 'Las siete piedras de los chakras, en equilibrio en un solo árbol.',
      },
      en: {
        label: 'Mixed',
        stones: 'Seven chakras',
        text: 'The seven chakra stones, balanced together in a single tree.',
      },
    },
  },
];

export const SIGNS: SignEntry[] = [
  {
    slug: 'aries',
    copy: {
      es: { label: 'Aries', dates: '21 mar – 19 abr', stone: 'Cornalina' },
      en: { label: 'Aries', dates: 'Mar 21 – Apr 19', stone: 'Carnelian' },
    },
  },
  {
    slug: 'tauro',
    copy: {
      es: { label: 'Tauro', dates: '20 abr – 20 may', stone: 'Cuarzo rosa' },
      en: { label: 'Taurus', dates: 'Apr 20 – May 20', stone: 'Rose quartz' },
    },
  },
  {
    slug: 'geminis',
    copy: {
      es: { label: 'Géminis', dates: '21 may – 20 jun', stone: 'Citrino' },
      en: { label: 'Gemini', dates: 'May 21 – Jun 20', stone: 'Citrine' },
    },
  },
  {
    slug: 'cancer',
    copy: {
      es: { label: 'Cáncer', dates: '21 jun – 22 jul', stone: 'Piedra luna' },
      en: { label: 'Cancer', dates: 'Jun 21 – Jul 22', stone: 'Moonstone' },
    },
  },
  {
    slug: 'leo',
    copy: {
      es: { label: 'Leo', dates: '23 jul – 22 ago', stone: 'Ojo de tigre' },
      en: { label: 'Leo', dates: 'Jul 23 – Aug 22', stone: 'Tiger’s eye' },
    },
  },
  {
    slug: 'virgo',
    copy: {
      es: { label: 'Virgo', dates: '23 ago – 22 sep', stone: 'Amazonita' },
      en: { label: 'Virgo', dates: 'Aug 23 – Sep 22', stone: 'Amazonite' },
    },
  },
  {
    slug: 'libra',
    copy: {
      es: { label: 'Libra', dates: '23 sep – 22 oct', stone: 'Lapislázuli' },
      en: { label: 'Libra', dates: 'Sep 23 – Oct 22', stone: 'Lapis lazuli' },
    },
  },
  {
    slug: 'escorpio',
    copy: {
      es: { label: 'Escorpio', dates: '23 oct – 21 nov', stone: 'Obsidiana' },
      en: { label: 'Scorpio', dates: 'Oct 23 – Nov 21', stone: 'Obsidian' },
    },
  },
  {
    slug: 'sagitario',
    copy: {
      es: { label: 'Sagitario', dates: '22 nov – 21 dic', stone: 'Turquesa' },
      en: { label: 'Sagittarius', dates: 'Nov 22 – Dec 21', stone: 'Turquoise' },
    },
  },
  {
    slug: 'capricornio',
    copy: {
      es: { label: 'Capricornio', dates: '22 dic – 19 ene', stone: 'Turmalina negra' },
      en: { label: 'Capricorn', dates: 'Dec 22 – Jan 19', stone: 'Black tourmaline' },
    },
  },
  {
    slug: 'acuario',
    copy: {
      es: { label: 'Acuario', dates: '20 ene – 18 feb', stone: 'Amatista' },
      en: { label: 'Aquarius', dates: 'Jan 20 – Feb 18', stone: 'Amethyst' },
    },
  },
  {
    slug: 'piscis',
    copy: {
      es: { label: 'Piscis', dates: '19 feb – 20 mar', stone: 'Aguamarina' },
      en: { label: 'Pisces', dates: 'Feb 19 – Mar 20', stone: 'Aquamarine' },
    },
  },
];

export const SIZES: SizeEntry[] = [
  { slug: 'mini', copy: { es: { label: 'Mini' }, en: { label: 'Mini' } } },
  { slug: 'estandar', copy: { es: { label: 'Estándar' }, en: { label: 'Standard' } } },
  { slug: 'grande', copy: { es: { label: 'Grande' }, en: { label: 'Large' } } },
  {
    slug: 'edicion-firma',
    copy: { es: { label: 'Edición Firma' }, en: { label: 'Signature Edition' } },
  },
];

export function intentionLabel(locale: LocaleCode, slug: string): string {
  return INTENTIONS.find((entry) => entry.slug === slug)?.copy[locale].label ?? '';
}
