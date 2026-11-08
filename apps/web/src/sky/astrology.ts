/**
 * Cálculo astronómico ligero (sin dependencias) para "Tu cielo": posición eclíptica del Sol y de
 * la Luna con las fórmulas de baja precisión de Meeus. Error típico < 0,5° (Sol) y ~1° (Luna):
 * suficiente para saber en qué signo estaban, salvo nacimientos justo en el cambio de signo.
 */

export const SIGN_CODES = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
] as const;
export type SignCode = (typeof SIGN_CODES)[number];

export type Element = 'fire' | 'earth' | 'air' | 'water';
export type Modality = 'cardinal' | 'fixed' | 'mutable';

export const ELEMENT_OF: Record<SignCode, Element> = {
  ARIES: 'fire',
  TAURUS: 'earth',
  GEMINI: 'air',
  CANCER: 'water',
  LEO: 'fire',
  VIRGO: 'earth',
  LIBRA: 'air',
  SCORPIO: 'water',
  SAGITTARIUS: 'fire',
  CAPRICORN: 'earth',
  AQUARIUS: 'air',
  PISCES: 'water',
};

export const MODALITY_OF: Record<SignCode, Modality> = {
  ARIES: 'cardinal',
  TAURUS: 'fixed',
  GEMINI: 'mutable',
  CANCER: 'cardinal',
  LEO: 'fixed',
  VIRGO: 'mutable',
  LIBRA: 'cardinal',
  SCORPIO: 'fixed',
  SAGITTARIUS: 'mutable',
  CAPRICORN: 'cardinal',
  AQUARIUS: 'fixed',
  PISCES: 'mutable',
};

const RAD = Math.PI / 180;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

/** Día juliano a partir de milisegundos UTC. */
export function julianDay(ms: number): number {
  return ms / 86_400_000 + 2_440_587.5;
}

/** Longitud eclíptica aparente del Sol (grados). */
export function sunLongitude(jd: number): number {
  const n = jd - 2_451_545.0;
  const L = norm(280.46 + 0.9856474 * n);
  const g = norm(357.528 + 0.9856003 * n) * RAD;
  return norm(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
}

/** Longitud eclíptica de la Luna (grados), términos principales de Meeus. */
export function moonLongitude(jd: number): number {
  const n = jd - 2_451_545.0;
  const L0 = norm(218.316 + 13.176396 * n);
  const M = norm(134.963 + 13.064993 * n) * RAD; // anomalía media lunar
  const Ms = norm(357.529 + 0.98560028 * n) * RAD; // anomalía media solar
  const D = norm(297.85 + 12.190749 * n) * RAD; // elongación media
  const F = norm(93.272 + 13.22935 * n) * RAD; // argumento de latitud
  return norm(
    L0 +
      6.289 * Math.sin(M) -
      1.274 * Math.sin(M - 2 * D) +
      0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * M) -
      0.186 * Math.sin(Ms) -
      0.114 * Math.sin(2 * F),
  );
}

export function signOf(longitude: number): SignCode {
  return SIGN_CODES[Math.floor(norm(longitude) / 30)]!;
}

/** Grados dentro del signo (0–30). */
export function degreeInSign(longitude: number): number {
  return norm(longitude) % 30;
}

export interface BirthData {
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM, o null si no se conoce la hora. */
  time: string | null;
}

export interface Chart {
  sun: SignCode;
  sunDegree: number;
  moon: SignCode;
  moonDegree: number;
  /** La Luna puede estar en el signo vecino si no hay hora exacta. */
  moonUncertain: boolean;
}

/** Instante del nacimiento en la zona horaria del navegador (sin hora: mediodía). */
export function birthInstant(birth: BirthData): number {
  const [y, m, d] = birth.date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = (birth.time ?? '12:00').split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm).getTime();
}

export function chartFor(birth: BirthData): Chart {
  const jd = julianDay(birthInstant(birth));
  const sun = sunLongitude(jd);
  const moon = moonLongitude(jd);
  // La Luna avanza ~13° al día: sin hora, si está a menos de 6.5° del borde puede ser el vecino.
  const moonDeg = degreeInSign(moon);
  return {
    sun: signOf(sun),
    sunDegree: degreeInSign(sun),
    moon: signOf(moon),
    moonDegree: moonDeg,
    moonUncertain: birth.time === null && (moonDeg < 6.5 || moonDeg > 23.5),
  };
}

/** Signo del Sol solo con la fecha (para la vista previa al elegir el día). */
export function sunSignForDate(date: string): SignCode | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return signOf(sunLongitude(julianDay(birthInstant({ date, time: null }))));
}

export type MoonPhase = 'new' | 'waxing' | 'full' | 'waning';

/** Signo de la Luna y fase para un día dado (al mediodía local). */
export function skyOfDay(day: Date): { moon: SignCode; phase: MoonPhase; illumination: number } {
  const noon = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).getTime();
  const jd = julianDay(noon);
  const moon = moonLongitude(jd);
  const elongation = norm(moon - sunLongitude(jd));
  const illumination = (1 - Math.cos(elongation * RAD)) / 2;
  const phase: MoonPhase =
    elongation < 22.5 || elongation >= 337.5
      ? 'new'
      : elongation < 157.5
        ? 'waxing'
        : elongation < 202.5
          ? 'full'
          : 'waning';
  return { moon: signOf(moon), phase, illumination };
}

/** Armonía entre elementos: 2 = fluye, 1 = neutral, 0 = tensión. */
export function elementHarmony(a: Element, b: Element): 0 | 1 | 2 {
  if (a === b) return 2;
  const pair = [a, b].sort().join('-');
  if (pair === 'air-fire' || pair === 'earth-water') return 2;
  if (pair === 'fire-water' || pair === 'air-earth') return 0;
  return 1;
}

/** Hash estable para elegir textos del día sin que cambien al recargar. */
export function seededIndex(key: string, length: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % Math.max(length, 1);
}
