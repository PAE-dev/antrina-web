import { type LocaleCode } from './common.js';
import { type ZodiacSignCode } from './catalog.js';

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
  /** Cálculos (sin sesión): los mismos de la tienda, para la app móvil. */
  chart: '/cielo-api/sky/chart',
  synastry: '/cielo-api/sky/synastry',
  daily: '/cielo-api/sky/daily',
  ranking: '/cielo-api/sky/ranking',
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

/* ------------------------------------------------------------------ cálculos (`@antrina/sky`) */

/** Datos de nacimiento para calcular una carta. */
export interface SkyBirthRequest {
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:MM o null si no se sabe la hora (se usa el mediodía). */
  birthTime: string | null;
  /** Con lugar y hora hay ascendente y casas. */
  place: SkyPlaceDto | null;
  /** Zona horaria IANA si no hay lugar (por defecto America/Lima). */
  timezone?: string;
}

export type SkyPointCode =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'ascendant';

export interface SkyPlacementDto {
  point: SkyPointCode;
  /** Longitud eclíptica (0–360). */
  longitude: number;
  sign: ZodiacSignCode;
  /** Grados dentro del signo (0–30). */
  degree: number;
  /** Casa (1–12) o null sin hora y lugar. */
  house: number | null;
  retrograde: boolean;
}

export interface NatalChartResponse {
  sun: ZodiacSignCode;
  moon: ZodiacSignCode;
  rising: ZodiacSignCode | null;
  placements: SkyPlacementDto[];
  ascendant: SkyPlacementDto | null;
  /** Cúspides de las 12 casas (Porphyry) o null. */
  cusps: number[] | null;
}

export type SkyBondAreaCode = 'moods' | 'talk' | 'love' | 'dreams';

export interface SynastryRequest {
  locale: LocaleCode;
  me: SkyBirthRequest;
  them: SkyBirthRequest;
  /** Nombre de la otra persona (para la lectura sin IA). */
  name?: string;
}

export interface SynastryResponse {
  /** 0–100 */
  percent: number;
  rows: { area: SkyBondAreaCode; score: number; mine: ZodiacSignCode; theirs: ZodiacSignCode }[];
  /** Aspectos más fuertes, ya en palabras del idioma pedido. */
  highlights: string[];
  /** Lectura armada sin IA con los mismos datos. */
  reading: string;
}

export type SkyMoonPhaseCode = 'new' | 'waxing' | 'full' | 'waning';
export type SkyDailyAreaCode = 'love' | 'money' | 'work' | 'energy';
export type SkyDayToneCode = 'bright' | 'steady' | 'calm';

/** Un signo en el ranking del día, con sus textos ya en el idioma pedido. */
export interface SkyRankedSignDto {
  sign: ZodiacSignCode;
  position: number;
  /** 0–100 */
  score: number;
  tier: 'high' | 'mid' | 'low';
  phrase: string;
  color: { hex: string; name: string };
  number: number;
  /** Hora de la suerte (inicio, 0–23). */
  hour: number;
  item: string;
  stone: { id: string; name: string };
}

export interface SkyDayOfSkyDto {
  moon: ZodiacSignCode;
  phase: SkyMoonPhaseCode;
  /** 0–1 */
  illumination: number;
  daysToFull: number;
  daysToNew: number;
}

/** Ranking de los 12 signos de un día (el mismo para todos; cambia a medianoche de Lima). */
export interface SkyRankingResponse {
  day: string;
  sky: SkyDayOfSkyDto;
  ranking: SkyRankedSignDto[];
}

export interface SkyDailyRequest {
  locale: LocaleCode;
  birth: SkyBirthRequest;
  /** YYYY-MM-DD; por defecto hoy en Lima. */
  day?: string;
  /** Semilla del papel de la fortuna (en la tienda, el id del dispositivo o de la cuenta). */
  seed?: string;
}

export interface SkyTransitDto {
  transiting: SkyPointCode;
  natal: SkyPointCode;
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
}

/** El día de una persona: de aquí salen todos los textos de "Hoy" para que no se contradigan. */
export interface SkyDailyResponse extends SkyRankingResponse {
  me: {
    sign: ZodiacSignCode;
    rank: SkyRankedSignDto;
    /** 0–100 por área (tránsitos del día sobre la carta). */
    indices: Record<SkyDailyAreaCode, number>;
    score: number;
    tone: SkyDayToneCode;
    best: SkyDailyAreaCode;
    worst: SkyDailyAreaCode;
    /** Signo con el que mejor fluye hoy. */
    ally: ZodiacSignCode;
    fortune: {
      level: SkyFortuneLevelCode;
      label: string;
      verseIndex: number;
      verse: string;
      stoneId: string;
    };
    /** Tránsito más exacto del día, si hay. */
    transit: SkyTransitDto | null;
  };
}
