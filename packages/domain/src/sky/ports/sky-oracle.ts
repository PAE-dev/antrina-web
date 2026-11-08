import { type SkyTopic } from '../sky-profile.js';

/** Lo que el oráculo sabe al responder: la pregunta y el cielo de quien pregunta. */
export interface SkyOracleQuestion {
  question: string;
  topic: SkyTopic;
  locale: 'es' | 'en';
  /** Nombres de signo ya traducidos (p. ej. "Tauro"). */
  sun: string;
  moon: string;
  ascendant: string | null;
  /** Tránsito del día en una frase ("Venus en tránsito trígono a tu Sol natal") o null. */
  transit: string | null;
  /** Piedra sugerida (la elige la app) y por qué se asocia con el tema. */
  stone: { name: string; meaning: string };
}

/** Respuesta escrita por un modelo de lenguaje (puerto: el SDK vive en la API). */
export interface SkyOracle {
  isConfigured(): boolean;
  answer(input: SkyOracleQuestion): Promise<string>;
}
