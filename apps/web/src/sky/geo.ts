/**
 * Lugar de nacimiento: búsqueda de ciudades con la API pública de geocodificación de Open-Meteo
 * (sin clave; solo se envía el texto que la persona escribe). La conversión de la hora local a UTC
 * vive en `@antrina/sky`).
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
