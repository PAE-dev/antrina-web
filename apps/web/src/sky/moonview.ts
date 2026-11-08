import { julianDay, moonLongitude, sunLongitude } from './astrology';

/**
 * La Luna tal como se ve desde un lugar y un momento: fase (iluminación y ángulo de fase), hacia
 * dónde apunta el lado iluminado en el cielo de ese observador (ángulo del limbo brillante menos el
 * ángulo paraláctico, Meeus cap. 48 y 14), altura sobre el horizonte y dirección.
 */

const RAD = Math.PI / 180;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

export interface MoonView {
  /** Fracción iluminada (0 nueva … 1 llena). */
  illumination: number;
  /** Ángulo de fase en radianes (0 llena … π nueva). */
  phaseAngle: number;
  /** Ángulo en pantalla del lado iluminado, medido desde "arriba" (cenit) hacia la izquierda. */
  limbAngle: number;
  /** Giro del disco: dónde queda el norte lunar respecto al cenit (radianes). */
  northAngle: number;
  /** Altura sobre el horizonte (grados). */
  altitude: number;
  /** Acimut desde el norte, hacia el este (grados). */
  azimuth: number;
  waxing: boolean;
}

function toEquatorial(lambda: number, beta: number, eps: number): { ra: number; dec: number } {
  const l = lambda * RAD;
  const b = beta * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
  return { ra, dec };
}

export function moonView(date: Date, lat: number, lon: number): MoonView {
  const jd = julianDay(date.getTime());
  const n = jd - 2_451_545;
  const T = n / 36_525;
  const eps = (23.4392911 - 0.0130042 * T) * RAD;
  const lm = moonLongitude(jd);
  const F = norm(93.272 + 13.22935 * n) * RAD;
  const bm = 5.128 * Math.sin(F); // latitud eclíptica de la Luna
  const ls = sunLongitude(jd);
  const moon = toEquatorial(lm, bm, eps);
  const sun = toEquatorial(ls, 0, eps);

  const dRa = sun.ra - moon.ra;
  const cosPsi =
    Math.sin(sun.dec) * Math.sin(moon.dec) + Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(dRa);
  const psi = Math.acos(Math.min(1, Math.max(-1, cosPsi)));
  const phaseAngle = Math.PI - psi;
  const illumination = (1 + Math.cos(phaseAngle)) / 2;

  // Ángulo de posición del limbo brillante (desde el norte celeste, hacia el este).
  const chi = Math.atan2(
    Math.cos(sun.dec) * Math.sin(dRa),
    Math.sin(sun.dec) * Math.cos(moon.dec) - Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(dRa),
  );
  // Ángulo paraláctico del observador.
  const gmst = norm(280.46061837 + 360.98564736629 * n + 0.000387933 * T * T);
  const H = norm(gmst + lon) * RAD - moon.ra;
  const phi = lat * RAD;
  const q = Math.atan2(
    Math.sin(H),
    Math.tan(phi) * Math.cos(moon.dec) - Math.sin(moon.dec) * Math.cos(H),
  );

  const altitude =
    Math.asin(
      Math.sin(phi) * Math.sin(moon.dec) + Math.cos(phi) * Math.cos(moon.dec) * Math.cos(H),
    ) / RAD;
  const azFromSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(moon.dec) * Math.cos(phi),
  );
  const azimuth = norm(azFromSouth / RAD + 180);

  return {
    illumination,
    phaseAngle,
    limbAngle: chi - q,
    northAngle: -q,
    altitude,
    azimuth,
    waxing: norm(lm - ls) < 180,
  };
}

/** Rumbo en palabras (N, NE, E…) para un acimut. */
export function compass(azimuth: number, locale: 'es' | 'en'): string {
  const es = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  const en = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const i = Math.round(norm(azimuth) / 45) % 8;
  return (locale === 'es' ? es : en)[i]!;
}
