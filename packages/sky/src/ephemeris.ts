import { julianDay, moonLongitude, signOf, sunLongitude, type SignCode } from './astrology.js';

/**
 * Carta natal completa sin dependencias: planetas con los elementos keplerianos aproximados de
 * JPL (Standish, válidos 1800–2050, error típico < 1°), ascendente y medio cielo con el tiempo
 * sidéreo local, y casas Porfirio (como muchas apps). La Luna y el Sol vienen de `astrology.ts`.
 */

export type Planet =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';
export type Point = Planet | 'ascendant';

export const PLANETS: Planet[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

const RAD = Math.PI / 180;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

type Elements = [number, number, number, number, number, number]; // a, e, I, L, ϖ, Ω
const ELEMENTS: Record<string, [Elements, Elements]> = {
  mercury: [
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  ],
  venus: [
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  ],
  earth: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ],
  jupiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  ],
  saturn: [
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  ],
  uranus: [
    [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  ],
  neptune: [
    [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  ],
  pluto: [
    [39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684],
    [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482],
  ],
};

/** Posición heliocéntrica eclíptica (J2000) de un planeta. */
function heliocentric(name: string, T: number): [number, number, number] {
  const [base, rate] = ELEMENTS[name]!;
  const [a, e, I, L, varpi, Omega] = base.map((v, i) => v + rate[i]! * T) as Elements;
  const M = norm(L - varpi) * RAD;
  const w = (varpi - Omega) * RAD;
  const O = Omega * RAD;
  const inc = I * RAD;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const ci = Math.cos(inc);
  const si = Math.sin(inc);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Longitud eclíptica geocéntrica (equinoccio de la fecha) de cualquier cuerpo. */
export function longitudeOf(planet: Planet, jd: number): number {
  if (planet === 'sun') return sunLongitude(jd);
  if (planet === 'moon') return moonLongitude(jd);
  const T = (jd - 2_451_545) / 36_525;
  const [px, py] = heliocentric(planet, T);
  const [ex, ey] = heliocentric('earth', T);
  // Precesión aproximada de J2000 a la fecha.
  return norm(Math.atan2(py - ey, px - ex) / RAD + 1.397 * T);
}

/** ¿Retrógrado? (la longitud baja de un día al siguiente). */
export function isRetrograde(planet: Planet, jd: number): boolean {
  if (planet === 'sun' || planet === 'moon') return false;
  const d = longitudeOf(planet, jd + 0.5) - longitudeOf(planet, jd - 0.5);
  return ((d + 540) % 360) - 180 < 0;
}

/** Ascendente y medio cielo para una latitud/longitud (grados; este positivo). */
export function angles(jd: number, lat: number, lon: number): { asc: number; mc: number } {
  const T = (jd - 2_451_545) / 36_525;
  const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2_451_545) + 0.000387933 * T * T);
  const ramc = norm(gmst + lon) * RAD;
  const eps = (23.4392911 - 0.0130042 * T) * RAD;
  const phi = lat * RAD;
  const asc = norm(
    Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) /
      RAD,
  );
  const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / RAD);
  return { asc, mc };
}

/** Cúspides de las 12 casas (Porfirio: cada cuadrante en tres partes iguales). */
export function porphyryCusps(asc: number, mc: number): number[] {
  const ic = norm(mc + 180);
  const dsc = norm(asc + 180);
  const arc = (from: number, to: number) => norm(to - from);
  const cusps = new Array<number>(12);
  const fill = (start: number, end: number, first: number) => {
    const step = arc(start, end) / 3;
    for (let k = 0; k < 3; k++) cusps[first + k] = norm(start + step * k);
  };
  fill(asc, ic, 0); // casas 1–3
  fill(ic, dsc, 3); // 4–6
  fill(dsc, mc, 6); // 7–9
  fill(mc, asc, 9); // 10–12
  return cusps;
}

export function houseOf(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    const end = cusps[(i + 1) % 12]!;
    if (norm(longitude - start) < norm(end - start)) return i + 1;
  }
  return 1;
}

export interface Placement {
  point: Point;
  longitude: number;
  sign: SignCode;
  degree: number;
  house: number | null;
  retrograde: boolean;
}

export interface NatalChart {
  placements: Placement[];
  ascendant: Placement | null;
  cusps: number[] | null;
}

export interface BirthMoment {
  /** Instante UTC del nacimiento (ms). */
  utc: number;
  place: { lat: number; lon: number } | null;
}

export function natalChart(moment: BirthMoment): NatalChart {
  const jd = julianDay(moment.utc);
  let cusps: number[] | null = null;
  let ascendant: Placement | null = null;
  if (moment.place) {
    const { asc, mc } = angles(jd, moment.place.lat, moment.place.lon);
    cusps = porphyryCusps(asc, mc);
    ascendant = {
      point: 'ascendant',
      longitude: asc,
      sign: signOf(asc),
      degree: asc % 30,
      house: 1,
      retrograde: false,
    };
  }
  const placements = PLANETS.map((planet) => {
    const longitude = longitudeOf(planet, jd);
    return {
      point: planet,
      longitude,
      sign: signOf(longitude),
      degree: longitude % 30,
      house: cusps ? houseOf(longitude, cusps) : null,
      retrograde: isRetrograde(planet, jd),
    } satisfies Placement;
  });
  return { placements, ascendant, cusps };
}

export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
const ASPECTS: [AspectKind, number, number][] = [
  ['conjunction', 0, 7],
  ['sextile', 60, 4],
  ['square', 90, 6],
  ['trine', 120, 6],
  ['opposition', 180, 7],
];

export interface Transit {
  transiting: Planet;
  natal: Point;
  aspect: AspectKind;
  orb: number;
}

/** Tránsitos de hoy sobre los puntos personales de la carta, del más exacto al menos. */
export function transitsFor(chart: NatalChart, day: Date): Transit[] {
  const jd = julianDay(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).getTime());
  const movers: Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const targets = chart.placements.filter((p) =>
    ['sun', 'moon', 'venus', 'mars'].includes(p.point),
  );
  if (chart.ascendant) targets.push(chart.ascendant);
  const out: Transit[] = [];
  for (const mover of movers) {
    const lon = longitudeOf(mover, jd);
    for (const target of targets) {
      const diff = Math.abs(((lon - target.longitude + 540) % 360) - 180);
      for (const [kind, angle, orb] of ASPECTS) {
        const off = Math.abs(diff - angle);
        if (off <= orb)
          out.push({ transiting: mover, natal: target.point, aspect: kind, orb: off });
      }
    }
  }
  // La Luna se mueve rápido: pesa menos para que el "tema del día" no sea siempre lunar.
  return out.sort(
    (a, b) => a.orb * (a.transiting === 'moon' ? 2 : 1) - b.orb * (b.transiting === 'moon' ? 2 : 1),
  );
}
