import {
  ELEMENT_OF,
  elementHarmony,
  julianDay,
  seededIndex,
  SIGN_CODES,
  type SignCode,
} from './astrology';
import {
  FORTUNE_LEVELS,
  type FortuneLevel,
  FORTUNE_VERSES,
  LUCKY_COLORS,
  LUCKY_ITEMS,
  RANK_PHRASES,
} from './daily-content';
import { longitudeOf, type NatalChart, type Planet } from './ephemeris';
import { STONE_LIBRARY } from './stones';

/**
 * El cielo del día para todos: ranking de los 12 signos (calculado con los planetas de hoy, no al
 * azar), su color, número, hora, objeto y piedra de la suerte; y para cada persona: sus índices por
 * área, su aliado y su papel de la fortuna. Todo es determinista: el mismo día da lo mismo en
 * cualquier dispositivo. El día cambia a medianoche, hora de Lima.
 */

const LIMA = 'America/Lima';

/** Fecha de hoy en Lima (YYYY-MM-DD). */
export function limaDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Mediodía de Lima (UTC−5, sin horario de verano) de ese día. */
export function limaNoon(day: string): Date {
  return new Date(`${day}T17:00:00Z`);
}

export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Segundos que faltan para la medianoche de Lima (para la caché de la página pública). */
export function secondsToLimaMidnight(now = new Date()): number {
  const next = new Date(`${addDays(limaDay(now), 1)}T05:00:00Z`);
  return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
}

/* ------------------------------------------------------------------ aspectos */

const MAJOR: [number, number, number][] = [
  // [ángulo, orbe, valor base]  conj y trígono/sextil suman; cuadratura y oposición restan
  [0, 8, 1],
  [60, 5, 0.6],
  [90, 6, -0.8],
  [120, 7, 1],
  [180, 7, -0.9],
];

function separation(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Valor (−1…1) del aspecto entre dos longitudes; 0 si no hay. Más exacto = más fuerte. */
function aspectValue(a: number, b: number, malefic: boolean): number {
  const sep = separation(a, b);
  for (const [angle, orb, value] of MAJOR) {
    const off = Math.abs(sep - angle);
    if (off <= orb) {
      const strength = 1 - off / (orb + 1);
      // Con Marte y Saturno, la conjunción pesa como tensión.
      const v = malefic && angle === 0 ? -0.6 : value;
      return v * strength;
    }
  }
  return 0;
}

const WEIGHTS: [Planet, number, boolean][] = [
  ['moon', 3, false],
  ['venus', 2, false],
  ['jupiter', 2, false],
  ['sun', 1.2, false],
  ['mercury', 1, false],
  ['mars', 1.5, true],
  ['saturn', 1.5, true],
];

function skyAt(day: string): Record<Planet, number> {
  const jd = julianDay(limaNoon(day).getTime());
  const out = {} as Record<Planet, number>;
  for (const [planet] of WEIGHTS) out[planet] = longitudeOf(planet, jd);
  return out;
}

/* ------------------------------------------------------------------ ranking */

export interface RankedSign {
  sign: SignCode;
  position: number;
  /** 0–100 */
  score: number;
  tier: 'high' | 'mid' | 'low';
  phraseIndex: number;
  colorIndex: number;
  number: number;
  /** Hora de la suerte (inicio, 0–23). */
  hour: number;
  itemIndex: number;
  stoneId: string;
}

const STONE_IDS = Object.keys(STONE_LIBRARY);

/** Ranking de los 12 signos para un día (el mismo para todos). */
export function rankingFor(day: string): RankedSign[] {
  const sky = skyAt(day);
  const moonElement = ELEMENT_OF[SIGN_CODES[Math.floor(sky.moon / 30)]!];
  const raw = SIGN_CODES.map((sign, i) => {
    const point = i * 30 + 15; // centro del signo (carta solar)
    let total = (elementHarmony(moonElement, ELEMENT_OF[sign]) - 1) * 1.6;
    for (const [planet, weight, malefic] of WEIGHTS) {
      total += aspectValue(sky[planet], point, malefic) * weight;
    }
    // Desempate estable y pequeño, distinto cada día.
    total += seededIndex(`${day}-${sign}-tie`, 100) / 1000;
    return { sign, total };
  });
  const sorted = [...raw].sort((a, b) => b.total - a.total);
  const max = sorted[0]!.total;
  const min = sorted[sorted.length - 1]!.total;
  const firstOfTier = { high: 0, mid: 3, low: 9 };
  return sorted.map(({ sign, total }, index) => {
    const position = index + 1;
    const tier: RankedSign['tier'] = position <= 3 ? 'high' : position >= 10 ? 'low' : 'mid';
    const key = `${day}-${sign}`;
    return {
      sign,
      position,
      score: Math.round(18 + ((total - min) / Math.max(max - min, 0.001)) * 78),
      tier,
      phraseIndex:
        (seededIndex(`${day}-${tier}-phrase`, RANK_PHRASES[tier].es.length) +
          (index - firstOfTier[tier])) %
        RANK_PHRASES[tier].es.length,
      colorIndex: seededIndex(`${key}-color`, LUCKY_COLORS.length),
      number: 1 + seededIndex(`${key}-number`, 9),
      hour: 8 + seededIndex(`${key}-hour`, 13),
      itemIndex: seededIndex(`${key}-item`, LUCKY_ITEMS.es.length),
      stoneId: STONE_IDS[seededIndex(`${key}-stone`, STONE_IDS.length)]!,
    };
  });
}

/* ------------------------------------------------------------------ índices personales */

export type DailyArea = 'love' | 'money' | 'work' | 'energy';

/** Planetas que miran cada área y los puntos natales con los que se comparan. */
const AREA_RULES: Record<DailyArea, { movers: [Planet, boolean][]; natal: string[] }> = {
  love: {
    movers: [
      ['venus', false],
      ['moon', false],
      ['mars', true],
    ],
    natal: ['venus', 'moon', 'sun'],
  },
  money: {
    movers: [
      ['jupiter', false],
      ['venus', false],
      ['saturn', true],
    ],
    natal: ['sun', 'venus', 'jupiter'],
  },
  work: {
    movers: [
      ['sun', false],
      ['mercury', false],
      ['saturn', true],
      ['mars', true],
    ],
    natal: ['sun', 'mercury', 'saturn'],
  },
  energy: {
    movers: [
      ['moon', false],
      ['mars', true],
      ['sun', false],
    ],
    natal: ['sun', 'moon', 'mars'],
  },
};

/** Índices 0–100 por área con los tránsitos del día sobre la carta natal. */
export function dailyIndices(chart: NatalChart, day: string): Record<DailyArea, number> {
  const jd = julianDay(limaNoon(day).getTime());
  const natal = new Map(chart.placements.map((p) => [p.point as string, p.longitude]));
  const out = {} as Record<DailyArea, number>;
  for (const area of Object.keys(AREA_RULES) as DailyArea[]) {
    const { movers, natal: targets } = AREA_RULES[area];
    let total = 0;
    for (const [planet, malefic] of movers) {
      const lon = longitudeOf(planet, jd);
      for (const target of targets) {
        const value = natal.get(target);
        if (value !== undefined) total += aspectValue(lon, value, malefic);
      }
    }
    const base = 58 + total * 16 + (seededIndex(`${day}-${area}`, 11) - 5);
    out[area] = Math.max(12, Math.min(97, Math.round(base)));
  }
  return out;
}

/** El signo con el que mejor fluyes hoy: armonía de elementos con tu Sol + su puesto del día. */
export function dailyAlly(sun: SignCode, ranking: RankedSign[]): SignCode {
  const best = ranking
    .filter((r) => r.sign !== sun)
    .map((r) => ({
      sign: r.sign,
      value: elementHarmony(ELEMENT_OF[sun], ELEMENT_OF[r.sign]) * 40 + r.score,
    }))
    .sort((a, b) => b.value - a.value)[0];
  return best!.sign;
}

/* ------------------------------------------------------------------ papel de la fortuna */

export interface Fortune {
  level: FortuneLevel;
  verseIndex: number;
  stoneId: string;
}

/** El papel del día: igual en cualquier dispositivo para la misma persona (fecha de nacimiento). */
export function fortuneFor(day: string, seed: string): Fortune {
  const roll = seededIndex(`${day}-${seed}-fortune`, 100);
  // Gran luz 15 %, Buena luz 35 %, Luz serena 35 %, Luz que despierta 15 %.
  const level: FortuneLevel =
    roll < 15 ? 'great' : roll < 50 ? 'good' : roll < 85 ? 'serene' : 'awakening';
  return {
    level,
    verseIndex: seededIndex(`${day}-${seed}-verse`, FORTUNE_VERSES[level].es.length),
    stoneId: STONE_IDS[seededIndex(`${day}-${seed}-stone`, STONE_IDS.length)]!,
  };
}

export const isFortuneLevel = (value: unknown): value is FortuneLevel =>
  typeof value === 'string' && (FORTUNE_LEVELS as readonly string[]).includes(value);

/* ------------------------------------------------------------------ racha */

/** Días seguidos (terminando hoy, o ayer si hoy aún no entró). */
export function streakOf(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export const STREAK_GOAL = 7;
