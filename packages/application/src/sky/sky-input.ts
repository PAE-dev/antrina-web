import {
  assertBirthDate,
  assertBirthTime,
  assertPlace,
  DomainError,
  type SkyPlace,
} from '@antrina/domain';
import { optionalString, requireString } from '../shared/input.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_TIME_ZONE = 'America/Lima';

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DomainError(`El campo "${field}" debe ser un número`, 'input.invalid');
  }
  return value;
}

export function parsePlace(value: unknown): SkyPlace | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') throw new DomainError('Lugar inválido', 'sky.invalid_place');
  const raw = value as Record<string, unknown>;
  const place: SkyPlace = {
    name: requireString(raw.name, 'place.name', 120).trim(),
    region: (optionalString(raw.region, 'place.region', 120) ?? '').trim(),
    country: (optionalString(raw.country, 'place.country', 120) ?? '').trim(),
    lat: requireNumber(raw.lat, 'place.lat'),
    lon: requireNumber(raw.lon, 'place.lon'),
    timezone: requireString(raw.timezone, 'place.timezone', 64),
  };
  assertPlace(place);
  return place;
}

function assertTimeZone(value: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    throw new DomainError('Zona horaria inválida', 'sky.invalid_place');
  }
}

export interface ParsedBirth {
  date: string;
  time: string | null;
  place: SkyPlace | null;
  /** Zona horaria para un nacimiento sin lugar. */
  timeZone: string;
}

/** Datos de nacimiento de un body (`SkyBirthRequest`), con las mismas reglas que el perfil. */
export function parseBirth(value: unknown, now: Date, field = 'birth'): ParsedBirth {
  if (!value || typeof value !== 'object') {
    throw new DomainError(`Falta "${field}"`, 'input.invalid');
  }
  const raw = value as Record<string, unknown>;
  const date = requireString(raw.birthDate, `${field}.birthDate`, 10);
  assertBirthDate(date, now);
  const time = optionalString(raw.birthTime, `${field}.birthTime`, 5);
  if (time) assertBirthTime(time);
  const place = parsePlace(raw.place);
  if (place) assertTimeZone(place.timezone);
  const timeZone = optionalString(raw.timezone, `${field}.timezone`, 64) ?? DEFAULT_TIME_ZONE;
  assertTimeZone(timeZone);
  return { date, time: time || null, place, timeZone };
}

/** Día del cielo (YYYY-MM-DD), real y entre 1900 y 2200. */
export function parseSkyDay(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !DAY.test(value)) {
    throw new DomainError('Día inválido', 'sky.invalid_day');
  }
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || y < 1900 || y > 2200) {
    throw new DomainError('Día inválido', 'sky.invalid_day');
  }
  return value;
}
