import { type LocaleCode } from '@antrina/contracts';
import { ELEMENT_OF, elementHarmony, type SignCode } from './astrology.js';
import { aspectValue } from './daily.js';
import { type NatalChart, type Planet } from './ephemeris.js';

/**
 * Sinastría: compara las dos cartas planeta por planeta (ángulos reales, no solo el signo) y da un
 * puntaje 0–100 por área de la relación, con los aspectos que más pesan en cada una.
 */

type L<T> = Record<LocaleCode, T>;
export type BondArea = 'moods' | 'talk' | 'love' | 'dreams';

/** [mi planeta, su planeta, peso] por área. */
const RULES: Record<BondArea, [Planet, Planet, number][]> = {
  moods: [
    ['moon', 'moon', 2],
    ['moon', 'sun', 1.5],
    ['sun', 'moon', 1.5],
  ],
  talk: [
    ['mercury', 'mercury', 2],
    ['sun', 'sun', 1.2],
    ['mercury', 'moon', 1],
  ],
  love: [
    ['venus', 'mars', 2],
    ['mars', 'venus', 2],
    ['venus', 'venus', 1.2],
    ['moon', 'venus', 1],
  ],
  dreams: [
    ['sun', 'jupiter', 1.5],
    ['jupiter', 'sun', 1.5],
    ['venus', 'jupiter', 1],
    ['sun', 'sun', 1],
  ],
};

const MALEFIC = new Set<Planet>(['mars', 'saturn']);

const BODY: L<Partial<Record<Planet, string>>> = {
  es: {
    sun: 'Sol',
    moon: 'Luna',
    mercury: 'Mercurio',
    venus: 'Venus',
    mars: 'Marte',
    jupiter: 'Júpiter',
  },
  en: {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
  },
};

const ASPECT_WORD: L<{ harmony: string; tension: string }> = {
  es: { harmony: 'en armonía con', tension: 'en tensión con' },
  en: { harmony: 'in harmony with', tension: 'in tension with' },
};

export interface BondRow {
  area: BondArea;
  /** 0–100 */
  score: number;
  /** Signos que se comparan en esta área (los que se muestran bajo la barra). */
  mine: SignCode;
  theirs: SignCode;
}

export interface Synastry {
  rows: BondRow[];
  percent: number;
  /** Los aspectos más fuertes, en palabras ("Tu Venus en armonía con su Marte"). */
  highlights: string[];
}

function signAt(chart: NatalChart, planet: Planet): SignCode {
  return chart.placements.find((p) => p.point === planet)!.sign;
}

function lonAt(chart: NatalChart, planet: Planet): number {
  return chart.placements.find((p) => p.point === planet)!.longitude;
}

const SHOWN: Record<BondArea, [Planet, Planet]> = {
  moods: ['moon', 'moon'],
  talk: ['mercury', 'mercury'],
  love: ['venus', 'mars'],
  dreams: ['sun', 'jupiter'],
};

export function synastry(me: NatalChart, them: NatalChart, locale: LocaleCode): Synastry {
  const found: { text: string; weight: number }[] = [];
  const rows = (Object.keys(RULES) as BondArea[]).map((area) => {
    let total = 0;
    for (const [mine, theirs, weight] of RULES[area]) {
      const value = aspectValue(
        lonAt(me, mine),
        lonAt(them, theirs),
        MALEFIC.has(mine) || MALEFIC.has(theirs),
      );
      total += value * weight;
      if (Math.abs(value) > 0.35) {
        const kind = value > 0 ? ASPECT_WORD[locale].harmony : ASPECT_WORD[locale].tension;
        const text =
          locale === 'es'
            ? `Tu ${BODY.es[mine]} ${kind} su ${BODY.es[theirs]}`
            : `Your ${BODY.en[mine]} ${kind} their ${BODY.en[theirs]}`;
        found.push({ text, weight: Math.abs(value * weight) });
      }
    }
    const [a, b] = SHOWN[area];
    const harmony = elementHarmony(ELEMENT_OF[signAt(me, a)], ELEMENT_OF[signAt(them, b)]);
    const score = Math.max(15, Math.min(97, Math.round(50 + total * 14 + (harmony - 1) * 9)));
    return { area, score, mine: signAt(me, a), theirs: signAt(them, b) };
  });
  const percent = Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  const highlights = found
    .sort((x, y) => y.weight - x.weight)
    .map((h) => h.text)
    .filter((text, i, all) => all.indexOf(text) === i)
    .slice(0, 5);
  return { rows, percent, highlights };
}

const AREA_WORD: L<Record<BondArea, string>> = {
  es: {
    moods: 'las emociones',
    talk: 'la comunicación',
    love: 'el amor y la atracción',
    dreams: 'los sueños compartidos',
  },
  en: {
    moods: 'emotions',
    talk: 'communication',
    love: 'love and attraction',
    dreams: 'shared dreams',
  },
};

/** Lectura sin IA, armada con los datos reales de la pareja (respaldo si la IA no responde). */
export function bondFallback(s: Synastry, name: string, locale: LocaleCode): string {
  const sorted = [...s.rows].sort((a, b) => b.score - a.score);
  const best = AREA_WORD[locale][sorted[0]!.area];
  const worst = AREA_WORD[locale][sorted[sorted.length - 1]!.area];
  const lead = s.highlights[0];
  if (locale === 'es') {
    const tone =
      s.percent >= 72
        ? `Tu cielo y el de ${name} se entienden con facilidad.`
        : s.percent >= 52
          ? `Tu cielo y el de ${name} tienen una base buena que crece con acuerdos claros.`
          : `Tu cielo y el de ${name} son distintos, y eso puede enseñarles mucho si se escuchan.`;
    return `${tone} Donde más fluyen es en ${best}${lead ? ` (${lead.charAt(0).toLowerCase()}${lead.slice(1)})` : ''}. Lo que más cuidado pide es ${worst}: ahí conviene hablar con calma y sin dar nada por sentado.`;
  }
  const tone =
    s.percent >= 72
      ? `Your sky and ${name}'s understand each other easily.`
      : s.percent >= 52
        ? `Your sky and ${name}'s have a good base that grows with clear agreements.`
        : `Your sky and ${name}'s are different, and that can teach you a lot if you listen.`;
  return `${tone} You flow best in ${best}${lead ? ` (${lead.charAt(0).toLowerCase()}${lead.slice(1)})` : ''}. What needs most care is ${worst}: talk calmly there and take nothing for granted.`;
}
