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
