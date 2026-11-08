/**
 * Lugar de nacimiento: búsqueda de ciudades con la API pública de geocodificación de Open-Meteo
 * (sin clave; solo se envía el texto que la persona escribe) y conversión de la hora local de
 * nacimiento a UTC con la zona horaria histórica de esa ciudad (Intl, incluye horarios de verano).
 */

export interface Place {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  admin1?: string;
}

export async function searchPlaces(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${language}&format=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { results?: GeoResult[] };
  return (data.results ?? [])
    .filter((r) => r.timezone)
    .map((r) => ({
      name: r.name,
      region: r.admin1 ?? '',
      country: r.country ?? '',
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone!,
    }));
}

/** Diferencia (minutos) entre la hora local de `timeZone` y UTC en ese instante. */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return (asUtc - utcMs) / 60_000;
}

/** Instante UTC de una fecha y hora locales en la zona horaria dada (dos pasadas por si hay DST). */
export function zonedToUtc(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  try {
    let guess = naive - offsetMinutes(naive, timeZone) * 60_000;
    guess = naive - offsetMinutes(guess, timeZone) * 60_000;
    return guess;
  } catch {
    return new Date(y, m - 1, d, hh, mm).getTime();
  }
}
