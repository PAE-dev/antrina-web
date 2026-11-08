import { natalChart, type NatalChart } from './ephemeris.js';
import { zonedToUtc } from './time.js';

/** Datos de nacimiento tal como los guarda "Tu cielo" (perfil o vínculo). */
export interface BirthInput {
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM, o null si no se conoce la hora. */
  time: string | null;
  place: { lat: number; lon: number; timezone: string } | null;
}

/**
 * Instante UTC del nacimiento. Con lugar, en su zona horaria histórica. Sin lugar, en
 * `fallbackTimeZone` si se da (la API) o en la del dispositivo (el navegador). Sin hora: mediodía.
 */
export function birthUtc(birth: BirthInput, fallbackTimeZone?: string): number {
  const time = birth.time ?? '12:00';
  const timeZone = birth.place?.timezone ?? fallbackTimeZone;
  if (timeZone) return zonedToUtc(birth.date, time, timeZone);
  const [y, m, d] = birth.date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/** Carta de un perfil: con lugar y hora hay ascendente y casas. */
export function chartFromBirth(birth: BirthInput, fallbackTimeZone?: string): NatalChart {
  return natalChart({
    utc: birthUtc(birth, fallbackTimeZone),
    place: birth.place && birth.time ? { lat: birth.place.lat, lon: birth.place.lon } : null,
  });
}
