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
  day: (day: string) => `/cielo-api/sky/days/${encodeURIComponent(day)}`,
  /** Pregunta al cielo respondida por IA (sin sesión; limitada por IP). */
  ask: '/cielo-api/ask',
  /** Lectura de compatibilidad escrita por IA (sin sesión; limitada por IP). */
  bondReading: '/cielo-api/bond-reading',
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

export type SkyFortuneLevelCode = 'great' | 'good' | 'serene' | 'awakening';

/** Un día en "Tu cielo": racha, ranking visto, ritual y papel de la fortuna. */
export interface SkyDayDto {
  day: string;
  rankingSeen: boolean;
  ritualDone: boolean;
  fortune: { level: SkyFortuneLevelCode; verseIndex: number; stoneId: string } | null;
}

export type MarkSkyDayRequest = Partial<Pick<SkyDayDto, 'rankingSeen' | 'ritualDone' | 'fortune'>>;

export interface SkyDataResponse {
  profile: SkyProfileDto | null;
  questions: SkyQuestionDto[];
  bonds: SkyBondDto[];
  /** Últimos 90 días con actividad. */
  days: SkyDayDto[];
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

export interface BondPersonDto {
  name: string;
  sun: string;
  moon: string;
  venus: string;
  mars: string;
}

/** Compatibilidad calculada en el navegador; la IA solo la pone en palabras. */
export interface BondReadingRequest {
  locale: 'es' | 'en';
  me: BondPersonDto;
  them: BondPersonDto;
  scores: { moods: number; talk: number; love: number; dreams: number; overall: number };
  highlights: string[];
}

/** `reading` es null si la IA no está disponible (la app usa su texto propio). */
export interface BondReadingResponse {
  reading: string | null;
}
