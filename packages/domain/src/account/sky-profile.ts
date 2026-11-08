import { DomainError } from '../shared/domain-error.js';

/** Datos de nacimiento de "Tu cielo" guardados en la cuenta. */
export interface SkyPlace {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  /** Zona horaria IANA (America/Lima). */
  timezone: string;
}

export interface SkyProfile {
  accountId: string;
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:MM o null si no se sabe la hora. */
  birthTime: string | null;
  place: SkyPlace | null;
  updatedAt: Date;
}

export const SKY_TOPICS = ['self', 'love', 'work', 'money'] as const;
export type SkyTopic = (typeof SKY_TOPICS)[number];

export interface SkyQuestion {
  id: string;
  question: string;
  topic: SkyTopic;
  /** Día del cielo consultado (YYYY-MM-DD). */
  day: string;
  createdAt: Date;
}

/** Persona guardada en Vínculos (compatibilidad). */
export interface SkyBond {
  id: string;
  name: string;
  birthDate: string;
  createdAt: Date;
}

export const SKY_LIMITS = {
  questions: 20,
  bonds: 30,
  questionLength: 140,
  nameLength: 40,
} as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Fecha real (no 2026-02-31), entre 1900 y hoy. */
export function assertBirthDate(value: string, now: Date): void {
  if (!DATE.test(value)) throw new DomainError('Fecha inválida', 'sky.invalid_date');
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new DomainError('Fecha inválida', 'sky.invalid_date');
  }
  if (y < 1900 || date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    throw new DomainError('Fecha fuera de rango', 'sky.invalid_date');
  }
}

export function assertBirthTime(value: string): void {
  if (!TIME.test(value)) throw new DomainError('Hora inválida', 'sky.invalid_time');
}

export function assertPlace(place: SkyPlace): void {
  const ok =
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lon) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lon) <= 180 &&
    place.name.trim().length > 0 &&
    /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(place.timezone);
  if (!ok) throw new DomainError('Lugar inválido', 'sky.invalid_place');
}
