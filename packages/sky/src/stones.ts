import { type LocaleCode } from '@antrina/contracts';
import { type SignCode } from './astrology.js';

/**
 * Piedras del zodiaco de Antrina (las mismas de la caja del "Arbolito de la Felicidad"): una por
 * signo, con su lema ("Yo soy", "Yo poseo"…), y fotos propias de cada mineral. Significados en tono
 * de tradición ("se asocia con"), nunca promesas.
 */
type L<T> = Record<LocaleCode, T>;

export interface ZodiacStone {
  id: string;
  image: string;
  name: L<string>;
  /** Color de acento de la piedra (bordes, brillos). */
  color: string;
  meaning: L<string>;
  /** Id de `content/stones.ts` si la tienda tiene página de significado. */
  shopId?: string;
}

const IMG = (id: string) => `/world/sky/stones/${id}.webp`;

export const STONE_LIBRARY: Record<string, ZodiacStone> = {
  'onix-negro': {
    id: 'onix-negro',
    image: IMG('onix-negro'),
    name: { es: 'Ónix negro', en: 'Black onyx' },
    color: '#7d7d8c',
    meaning: {
      es: 'Se asocia con la firmeza, la protección y la concentración. Acompaña a quien empieza algo y quiere sostener su fuerza.',
      en: 'Associated with steadiness, protection and focus. It accompanies those who start something and want to keep their strength.',
    },
  },
  'jaspe-rojo': {
    id: 'jaspe-rojo',
    image: IMG('jaspe-rojo'),
    name: { es: 'Jaspe rojo', en: 'Red jasper' },
    color: '#c4553a',
    meaning: {
      es: 'Piedra de tierra y de raíz: se asocia con la constancia, la vitalidad y la seguridad de lo propio.',
      en: 'A stone of earth and roots: associated with constancy, vitality and the security of what is yours.',
    },
  },
  amatista: {
    id: 'amatista',
    image: IMG('amatista-drusa'),
    name: { es: 'Amatista', en: 'Amethyst' },
    color: '#a07bd6',
    shopId: 'amatista',
    meaning: {
      es: 'Se asocia con la calma, la intuición y la claridad mental. Ayuda a ordenar las ideas antes de hablar.',
      en: 'Associated with calm, intuition and mental clarity. It helps order your thoughts before you speak.',
    },
  },
  citrino: {
    id: 'citrino',
    image: IMG('citrino'),
    name: { es: 'Citrino', en: 'Citrine' },
    color: '#e9b949',
    shopId: 'citrino',
    meaning: {
      es: 'La piedra del sol: se asocia con la abundancia, el optimismo y el calor del hogar que protege.',
      en: 'The stone of the sun: associated with abundance, optimism and the warmth of a protective home.',
    },
  },
  'agata-de-fuego': {
    id: 'agata-de-fuego',
    image: IMG('agata-de-fuego'),
    name: { es: 'Ágata de fuego', en: 'Fire agate' },
    color: '#e0662f',
    meaning: {
      es: 'Con sus destellos de fuego se asocia con la creatividad, la valentía y la alegría de mostrarse.',
      en: 'With its fiery flashes, it is associated with creativity, courage and the joy of showing yourself.',
    },
  },
  'cuarzo-rosa': {
    id: 'cuarzo-rosa',
    image: IMG('cuarzo-rosado'),
    name: { es: 'Cuarzo rosado', en: 'Rose quartz' },
    color: '#f2b8c6',
    shopId: 'cuarzo-rosa',
    meaning: {
      es: 'La piedra del amor: se asocia con la ternura, el cuidado y la paciencia contigo y con los demás.',
      en: 'The stone of love: associated with tenderness, care and patience with yourself and others.',
    },
  },
  crisocola: {
    id: 'crisocola',
    image: IMG('crisocola'),
    name: { es: 'Crisocola', en: 'Chrysocolla' },
    color: '#3fb5b0',
    meaning: {
      es: 'Se asocia con la comunicación serena y la armonía en los vínculos: decir lo justo con suavidad.',
      en: 'Associated with calm communication and harmony in relationships: saying the right thing gently.',
    },
  },
  jade: {
    id: 'jade',
    image: IMG('jade'),
    name: { es: 'Jade', en: 'Jade' },
    color: '#4fae6a',
    meaning: {
      es: 'Piedra de renovación y buena fortuna en muchas culturas: se asocia con la serenidad y los nuevos ciclos.',
      en: 'A stone of renewal and good fortune in many cultures: associated with serenity and new cycles.',
    },
  },
  'agata-fucsia': {
    id: 'agata-fucsia',
    image: IMG('agata-fucsia'),
    name: { es: 'Ágata fucsia', en: 'Fuchsia agate' },
    color: '#e0457b',
    meaning: {
      es: 'Sus bandas se asocian con el equilibrio en movimiento: entusiasmo para explorar sin perder el centro.',
      en: 'Its bands are associated with balance in motion: enthusiasm to explore without losing your center.',
    },
  },
  serpentina: {
    id: 'serpentina',
    image: IMG('serpentina'),
    name: { es: 'Serpentina', en: 'Serpentine' },
    color: '#9cb84a',
    meaning: {
      es: 'Se asocia con la disciplina tranquila y la capacidad de transformar el esfuerzo en logros duraderos.',
      en: 'Associated with quiet discipline and the ability to turn effort into lasting achievements.',
    },
  },
  sodalita: {
    id: 'sodalita',
    image: IMG('sodalita'),
    name: { es: 'Sodalita', en: 'Sodalite' },
    color: '#3557a8',
    meaning: {
      es: 'Piedra de la mente clara: se asocia con la comprensión, la intuición y las ideas que miran lejos.',
      en: 'The stone of a clear mind: associated with understanding, intuition and far-sighted ideas.',
    },
  },
  angelita: {
    id: 'angelita',
    image: IMG('angelita'),
    name: { es: 'Angelita', en: 'Angelite' },
    color: '#9fc4ea',
    meaning: {
      es: 'De azul cielo, se asocia con la paz interior, la compasión y la conexión con lo sutil.',
      en: 'Sky blue, it is associated with inner peace, compassion and connection with the subtle.',
    },
  },
  'cuarzo-cristal': {
    id: 'cuarzo-cristal',
    image: IMG('cuarzo-cristal'),
    name: { es: 'Cuarzo cristal', en: 'Clear quartz' },
    color: '#e6ecf5',
    meaning: {
      es: 'El maestro de los cuarzos: se asocia con la claridad y con amplificar la intención que pongas en él.',
      en: 'The master quartz: associated with clarity and amplifying whatever intention you place in it.',
    },
  },
};

/** Piedra y lema de cada signo (según la caja del Arbolito de la Felicidad). */
export const SIGN_STONE: Record<SignCode, { stone: string; motto: L<string> }> = {
  ARIES: { stone: 'onix-negro', motto: { es: 'Yo soy', en: 'I am' } },
  TAURUS: { stone: 'jaspe-rojo', motto: { es: 'Yo poseo', en: 'I have' } },
  GEMINI: { stone: 'amatista', motto: { es: 'Yo hablo', en: 'I speak' } },
  CANCER: { stone: 'citrino', motto: { es: 'Yo protejo', en: 'I protect' } },
  LEO: { stone: 'agata-de-fuego', motto: { es: 'Yo creo', en: 'I create' } },
  VIRGO: { stone: 'cuarzo-rosa', motto: { es: 'Yo sirvo', en: 'I serve' } },
  LIBRA: { stone: 'crisocola', motto: { es: 'Yo relaciono', en: 'I relate' } },
  SCORPIO: { stone: 'jade', motto: { es: 'Yo regenero', en: 'I renew' } },
  SAGITTARIUS: { stone: 'agata-fucsia', motto: { es: 'Yo busco', en: 'I seek' } },
  CAPRICORN: { stone: 'serpentina', motto: { es: 'Yo domino', en: 'I master' } },
  AQUARIUS: { stone: 'sodalita', motto: { es: 'Yo comprendo', en: 'I understand' } },
  PISCES: { stone: 'angelita', motto: { es: 'Yo redimo', en: 'I redeem' } },
};

export function signStone(code: SignCode): ZodiacStone {
  return STONE_LIBRARY[SIGN_STONE[code].stone]!;
}

/** Piedras para cada área de la guía diaria (con foto). */
export const AREA_STONES: Record<'love' | 'money' | 'work' | 'luck', string[]> = {
  love: ['cuarzo-rosa', 'amatista', 'angelita'],
  money: ['citrino', 'jade', 'agata-de-fuego'],
  work: ['sodalita', 'onix-negro', 'crisocola', 'serpentina'],
  luck: ['jade', 'cuarzo-cristal', 'agata-fucsia', 'citrino'],
};
