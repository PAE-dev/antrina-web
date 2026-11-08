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

/** Lo que se sabe de una persona en una lectura de compatibilidad (sin fecha de nacimiento). */
export interface BondPerson {
  name: string;
  sun: string;
  moon: string;
  venus: string;
  mars: string;
}

export interface SkyBondQuestion {
  locale: 'es' | 'en';
  me: BondPerson;
  them: BondPerson;
  /** Puntajes 0–100 por área, ya calculados con la sinastría. */
  scores: { moods: number; talk: number; love: number; dreams: number; overall: number };
  /** Aspectos más fuertes entre las dos cartas, en palabras. */
  highlights: string[];
}

/** Respuesta escrita por un modelo de lenguaje (puerto: el proveedor vive en la API). */
export interface SkyOracle {
  isConfigured(): boolean;
  answer(input: SkyOracleQuestion): Promise<string>;
  bondReading(input: SkyBondQuestion): Promise<string>;
}
