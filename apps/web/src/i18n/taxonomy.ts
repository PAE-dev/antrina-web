import { type LocaleCode, type ProductSizeCode, type ZodiacSignCode } from '@antrina/contracts';

/**
 * Taxonomía de la tienda (intenciones, signos, tamaños). Cada entrada tiene un slug por idioma
 * (`/intencion/amor` ↔ `/en/intention/love`) y una clave estable para la API: el slug de
 * categoría para intenciones y los códigos `ZodiacSignCode` / `ProductSizeCode`.
 */
export type Localized<T> = Record<LocaleCode, T>;

export interface IntentionEntry {
  category: string;
  slug: Localized<string>;
  /** Ids de `STONES` que acompañan esta intención. */
  stones: string[];
  copy: Localized<{
    label: string;
    stones: string;
    text: string;
    /** H1 y título para Google. */
    title: string;
    intro: string;
  }>;
}

export interface SignEntry {
  code: ZodiacSignCode;
  slug: Localized<string>;
  /** Id de `STONES` de la piedra afín. */
  stone: string;
  copy: Localized<{ label: string; dates: string; stone: string }>;
}

export interface SizeEntry {
  code: ProductSizeCode;
  slug: Localized<string>;
  copy: Localized<{ label: string; text: string }>;
}

export const INTENTIONS: IntentionEntry[] = [
  {
    category: 'abundancia',
    slug: { es: 'abundancia', en: 'abundance' },
    stones: ['citrino', 'pirita'],
    copy: {
      es: {
        label: 'Abundancia',
        stones: 'Citrino · Pirita',
        text: 'Para abrir caminos y atraer prosperidad a tu casa o negocio.',
        title: 'Árboles de cuarzo para la *abundancia*',
        intro:
          'El citrino y la pirita se asocian desde hace siglos con la prosperidad, la buena suerte y el impulso para empezar proyectos. Nuestros árboles de la abundancia se arman a mano en Lima, piedra por piedra, para acompañar la entrada de tu casa, tu escritorio o el mostrador de tu negocio.',
      },
      en: {
        label: 'Abundance',
        stones: 'Citrine · Pyrite',
        text: 'To open new paths and invite prosperity into your home or business.',
        title: 'Quartz trees for *abundance*',
        intro:
          'Citrine and pyrite have long been associated with prosperity, good fortune and the drive to start new projects. Our abundance trees are handmade in Lima, stone by stone, to sit by your front door, on your desk or on your shop counter.',
      },
    },
  },
  {
    category: 'amor',
    slug: { es: 'amor', en: 'love' },
    stones: ['cuarzo-rosa', 'rodonita'],
    copy: {
      es: {
        label: 'Amor',
        stones: 'Cuarzo rosa · Rodonita',
        text: 'Para cultivar el amor propio y los vínculos que te sostienen.',
        title: 'Árboles de cuarzo rosa para el *amor*',
        intro:
          'El cuarzo rosa es la piedra del amor por excelencia: se asocia con la ternura, el amor propio y la calma en las relaciones. Junto a la rodonita, forma árboles que son uno de nuestros regalos más pedidos para parejas, madres y amistades de toda la vida.',
      },
      en: {
        label: 'Love',
        stones: 'Rose quartz · Rhodonite',
        text: 'To nurture self-love and the bonds that hold you.',
        title: 'Rose quartz trees for *love*',
        intro:
          'Rose quartz is the stone of love: it is associated with tenderness, self-love and calm in relationships. Paired with rhodonite, it becomes one of our most requested gifts for partners, mothers and lifelong friends.',
      },
    },
  },
  {
    category: 'proteccion',
    slug: { es: 'proteccion', en: 'protection' },
    stones: ['turmalina-negra', 'amatista'],
    copy: {
      es: {
        label: 'Protección',
        stones: 'Turmalina negra · Amatista',
        text: 'Para resguardar tu espacio y tu energía de lo que no suma.',
        title: 'Árboles de cuarzo para la *protección*',
        intro:
          'La turmalina negra y la amatista se usan tradicionalmente para proteger los espacios y favorecer la calma. Son árboles pensados para la entrada de casa, el dormitorio o el lugar donde trabajas, armados a mano en nuestro taller familiar de Lima.',
      },
      en: {
        label: 'Protection',
        stones: 'Black tourmaline · Amethyst',
        text: 'To shelter your space and your energy from what does not serve you.',
        title: 'Quartz trees for *protection*',
        intro:
          'Black tourmaline and amethyst are traditionally used to protect spaces and encourage calm. These trees are made for your entrance, bedroom or workspace, handmade in our family workshop in Lima.',
      },
    },
  },
  {
    category: 'felicidad',
    slug: { es: 'felicidad', en: 'happiness' },
    stones: ['cornalina', 'ojo-de-tigre'],
    copy: {
      es: {
        label: 'Felicidad',
        stones: 'Cornalina · Ojo de tigre',
        text: 'Para encender la alegría, la creatividad y las ganas de empezar.',
        title: 'Árboles de cuarzo para la *felicidad*',
        intro:
          'La cornalina y el ojo de tigre son piedras cálidas que se asocian con la alegría, la creatividad y la confianza. Un árbol de la felicidad es un regalo luminoso para cumpleaños, nuevos comienzos y para quien necesita un empujón de ánimo.',
      },
      en: {
        label: 'Happiness',
        stones: 'Carnelian · Tiger’s eye',
        text: 'To spark joy, creativity and the courage to begin.',
        title: 'Quartz trees for *happiness*',
        intro:
          'Carnelian and tiger’s eye are warm stones associated with joy, creativity and confidence. A happiness tree is a bright gift for birthdays, new beginnings and anyone who needs a lift.',
      },
    },
  },
  {
    category: 'mixto',
    slug: { es: 'mixto', en: 'mixed' },
    stones: ['amatista', 'cuarzo-rosa', 'citrino', 'cornalina'],
    copy: {
      es: {
        label: 'Mixto',
        stones: 'Siete chakras',
        text: 'Las siete piedras de los chakras, en equilibrio en un solo árbol.',
        title: 'Árboles de *siete chakras*',
        intro:
          'Los árboles mixtos reúnen las siete piedras asociadas a los chakras, del rojo de la base al violeta de la corona. Son piezas llenas de color, pensadas para espacios de meditación, yoga o para quien quiere todas las intenciones en un solo árbol.',
      },
      en: {
        label: 'Mixed',
        stones: 'Seven chakras',
        text: 'The seven chakra stones, balanced together in a single tree.',
        title: '*Seven chakra* trees',
        intro:
          'Mixed trees bring together the seven stones associated with the chakras, from the red of the root to the violet of the crown. They are colorful pieces for meditation and yoga spaces, or for anyone who wants every intention in a single tree.',
      },
    },
  },
];

export const SIGNS: SignEntry[] = [
  {
    code: 'ARIES',
    slug: { es: 'aries', en: 'aries' },
    stone: 'cornalina',
    copy: {
      es: { label: 'Aries', dates: '21 mar – 19 abr', stone: 'Cornalina' },
      en: { label: 'Aries', dates: 'Mar 21 – Apr 19', stone: 'Carnelian' },
    },
  },
  {
    code: 'TAURUS',
    slug: { es: 'tauro', en: 'taurus' },
    stone: 'cuarzo-rosa',
    copy: {
      es: { label: 'Tauro', dates: '20 abr – 20 may', stone: 'Cuarzo rosa' },
      en: { label: 'Taurus', dates: 'Apr 20 – May 20', stone: 'Rose quartz' },
    },
  },
  {
    code: 'GEMINI',
    slug: { es: 'geminis', en: 'gemini' },
    stone: 'citrino',
    copy: {
      es: { label: 'Géminis', dates: '21 may – 20 jun', stone: 'Citrino' },
      en: { label: 'Gemini', dates: 'May 21 – Jun 20', stone: 'Citrine' },
    },
  },
  {
    code: 'CANCER',
    slug: { es: 'cancer', en: 'cancer' },
    stone: 'piedra-luna',
    copy: {
      es: { label: 'Cáncer', dates: '21 jun – 22 jul', stone: 'Piedra luna' },
      en: { label: 'Cancer', dates: 'Jun 21 – Jul 22', stone: 'Moonstone' },
    },
  },
  {
    code: 'LEO',
    slug: { es: 'leo', en: 'leo' },
    stone: 'ojo-de-tigre',
    copy: {
      es: { label: 'Leo', dates: '23 jul – 22 ago', stone: 'Ojo de tigre' },
      en: { label: 'Leo', dates: 'Jul 23 – Aug 22', stone: 'Tiger’s eye' },
    },
  },
  {
    code: 'VIRGO',
    slug: { es: 'virgo', en: 'virgo' },
    stone: 'amazonita',
    copy: {
      es: { label: 'Virgo', dates: '23 ago – 22 sep', stone: 'Amazonita' },
      en: { label: 'Virgo', dates: 'Aug 23 – Sep 22', stone: 'Amazonite' },
    },
  },
  {
    code: 'LIBRA',
    slug: { es: 'libra', en: 'libra' },
    stone: 'lapislazuli',
    copy: {
      es: { label: 'Libra', dates: '23 sep – 22 oct', stone: 'Lapislázuli' },
      en: { label: 'Libra', dates: 'Sep 23 – Oct 22', stone: 'Lapis lazuli' },
    },
  },
  {
    code: 'SCORPIO',
    slug: { es: 'escorpio', en: 'scorpio' },
    stone: 'obsidiana',
    copy: {
      es: { label: 'Escorpio', dates: '23 oct – 21 nov', stone: 'Obsidiana' },
      en: { label: 'Scorpio', dates: 'Oct 23 – Nov 21', stone: 'Obsidian' },
    },
  },
  {
    code: 'SAGITTARIUS',
    slug: { es: 'sagitario', en: 'sagittarius' },
    stone: 'turquesa',
    copy: {
      es: { label: 'Sagitario', dates: '22 nov – 21 dic', stone: 'Turquesa' },
      en: { label: 'Sagittarius', dates: 'Nov 22 – Dec 21', stone: 'Turquoise' },
    },
  },
  {
    code: 'CAPRICORN',
    slug: { es: 'capricornio', en: 'capricorn' },
    stone: 'turmalina-negra',
    copy: {
      es: { label: 'Capricornio', dates: '22 dic – 19 ene', stone: 'Turmalina negra' },
      en: { label: 'Capricorn', dates: 'Dec 22 – Jan 19', stone: 'Black tourmaline' },
    },
  },
  {
    code: 'AQUARIUS',
    slug: { es: 'acuario', en: 'aquarius' },
    stone: 'amatista',
    copy: {
      es: { label: 'Acuario', dates: '20 ene – 18 feb', stone: 'Amatista' },
      en: { label: 'Aquarius', dates: 'Jan 20 – Feb 18', stone: 'Amethyst' },
    },
  },
  {
    code: 'PISCES',
    slug: { es: 'piscis', en: 'pisces' },
    stone: 'aguamarina',
    copy: {
      es: { label: 'Piscis', dates: '19 feb – 20 mar', stone: 'Aguamarina' },
      en: { label: 'Pisces', dates: 'Feb 19 – Mar 20', stone: 'Aquamarine' },
    },
  },
];

export const SIZES: SizeEntry[] = [
  {
    code: 'MINI',
    slug: { es: 'mini', en: 'mini' },
    copy: {
      es: {
        label: 'Mini',
        text: 'Pequeños y delicados: para escritorios, repisas, mesas de noche y regalos corporativos.',
      },
      en: {
        label: 'Mini',
        text: 'Small and delicate: for desks, shelves, nightstands and corporate gifts.',
      },
    },
  },
  {
    code: 'STANDARD',
    slug: { es: 'estandar', en: 'standard' },
    copy: {
      es: {
        label: 'Estándar',
        text: 'Nuestro tamaño más elegido: presencia suficiente para una mesa de centro o una repisa.',
      },
      en: {
        label: 'Standard',
        text: 'Our most chosen size: enough presence for a coffee table or a shelf.',
      },
    },
  },
  {
    code: 'LARGE',
    slug: { es: 'grande', en: 'large' },
    copy: {
      es: {
        label: 'Grande',
        text: 'Árboles frondosos para recepciones, oficinas y salas que piden una pieza protagonista.',
      },
      en: {
        label: 'Large',
        text: 'Full trees for lobbies, offices and rooms that call for a statement piece.',
      },
    },
  },
  {
    code: 'SIGNATURE',
    slug: { es: 'edicion-firma', en: 'signature-edition' },
    copy: {
      es: {
        label: 'Edición Firma',
        text: 'Piezas únicas sobre bases de piedra en bruto, con las mejores piedras del taller.',
      },
      en: {
        label: 'Signature Edition',
        text: 'One-of-a-kind pieces on raw stone bases, with the finest stones in the workshop.',
      },
    },
  },
];

export const findIntentionBySlug = (locale: LocaleCode, slug: string) =>
  INTENTIONS.find((entry) => entry.slug[locale] === slug);

export const findSignBySlug = (locale: LocaleCode, slug: string) =>
  SIGNS.find((entry) => entry.slug[locale] === slug);

export const findSizeBySlug = (locale: LocaleCode, slug: string) =>
  SIZES.find((entry) => entry.slug[locale] === slug);

export const intentionByCategory = (category: string) =>
  INTENTIONS.find((entry) => entry.category === category);

export const signByCode = (code: ZodiacSignCode) => SIGNS.find((entry) => entry.code === code);

export const sizeByCode = (code: ProductSizeCode) => SIZES.find((entry) => entry.code === code);

export function intentionLabel(locale: LocaleCode, category: string): string {
  return intentionByCategory(category)?.copy[locale].label ?? '';
}
