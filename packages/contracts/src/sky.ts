/**
 * "Tu cielo" guardado en la cuenta (sesión de Google de la tienda). La tienda reenvía estas rutas
 * desde su dominio (`/cielo-api/*`) para que lleven la cookie de sesión.
 */
export const SKY_ROUTES = {
  prefix: '/cielo-api',
  sky: '/cielo-api/sky',
  questions: '/cielo-api/sky/questions',
  bonds: '/cielo-api/sky/bonds',
  bond: (id: string) => `/cielo-api/sky/bonds/${encodeURIComponent(id)}`,
  /** Pregunta al cielo respondida por IA (sin sesión; limitada por IP). */
  ask: '/cielo-api/ask',
} as const;

export interface SkyPlaceDto {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  /** Zona horaria IANA (America/Lima). */
  timezone: string;
}

export interface SkyProfileDto {
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:MM o null si no se sabe la hora. */
  birthTime: string | null;
  place: SkyPlaceDto | null;
}

export type SkyTopicCode = 'self' | 'love' | 'work' | 'money';

export interface SkyQuestionDto {
  id: string;
  question: string;
  topic: SkyTopicCode;
  day: string;
}

export interface SkyBondDto {
  id: string;
  name: string;
  birthDate: string;
}

export interface SkyDataResponse {
  profile: SkyProfileDto | null;
  questions: SkyQuestionDto[];
  bonds: SkyBondDto[];
}

export type SaveSkyProfileRequest = SkyProfileDto;

export interface AddSkyQuestionRequest {
  question: string;
  topic: SkyTopicCode;
  day: string;
}

export interface AddSkyBondRequest {
  name: string;
  birthDate: string;
}

/** Lo que la app sabe del cielo de quien pregunta (calculado en el navegador). */
export interface AskSkyRequest {
  question: string;
  topic: SkyTopicCode;
  locale: 'es' | 'en';
  sun: string;
  moon: string;
  ascendant: string | null;
  transit: string | null;
  stone: { name: string; meaning: string };
}

/** `answer` es null si la IA no está disponible: la app usa entonces sus textos propios. */
export interface AskSkyResponse {
  answer: string | null;
}
