import { type AskSkyResponse, type BondReadingResponse } from '@antrina/contracts';
import { DomainError, SKY_LIMITS, SKY_TOPICS, type SkyOracle } from '@antrina/domain';
import { optionalString, requireOneOf, requireString } from '../shared/input.js';

const LOCALES = ['es', 'en'] as const;

/**
 * "Pregunta al cielo" con un modelo de lenguaje. Valida lo que llega del navegador y, si el oráculo
 * no está configurado o falla, devuelve `answer: null` para que la app use sus textos propios.
 */
export class AskSkyUseCase {
  constructor(
    private readonly oracle: SkyOracle,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  async execute(body: unknown): Promise<AskSkyResponse> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const question = requireString(raw.question, 'question', SKY_LIMITS.questionLength).trim();
    if (!question) throw new DomainError('Escribe tu pregunta', 'input.invalid');
    const stone = (raw.stone ?? {}) as Record<string, unknown>;
    const input = {
      question,
      topic: requireOneOf(raw.topic, SKY_TOPICS, 'topic'),
      locale: requireOneOf(raw.locale, LOCALES, 'locale'),
      sun: requireString(raw.sun, 'sun', 30),
      moon: requireString(raw.moon, 'moon', 30),
      ascendant: optionalString(raw.ascendant, 'ascendant', 30),
      transit: optionalString(raw.transit, 'transit', 200),
      stone: {
        name: requireString(stone.name, 'stone.name', 60),
        meaning: requireString(stone.meaning, 'stone.meaning', 400),
      },
    };
    if (!this.oracle.isConfigured()) return { answer: null };
    try {
      const answer = (await this.oracle.answer(input)).trim();
      return { answer: answer || null };
    } catch (error) {
      this.log(`oráculo no disponible: ${(error as Error).message}`);
      return { answer: null };
    }
  }
}

function parseBondPerson(value: unknown, field: string) {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    name: requireString(raw.name, `${field}.name`, 40).trim() || '—',
    sun: requireString(raw.sun, `${field}.sun`, 30),
    moon: requireString(raw.moon, `${field}.moon`, 30),
    venus: requireString(raw.venus, `${field}.venus`, 30),
    mars: requireString(raw.mars, `${field}.mars`, 30),
  };
}

function score(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new DomainError(`Puntaje inválido: ${field}`, 'input.invalid');
  }
  return Math.round(value);
}

/** Lectura de compatibilidad escrita por IA con la sinastría ya calculada (o null si no hay IA). */
export class BondReadingUseCase {
  constructor(
    private readonly oracle: SkyOracle,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  async execute(body: unknown): Promise<BondReadingResponse> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const scores = (raw.scores ?? {}) as Record<string, unknown>;
    const highlights = Array.isArray(raw.highlights) ? raw.highlights : [];
    if (highlights.length > 8) throw new DomainError('Demasiados aspectos', 'input.invalid');
    const input = {
      locale: requireOneOf(raw.locale, LOCALES, 'locale'),
      me: parseBondPerson(raw.me, 'me'),
      them: parseBondPerson(raw.them, 'them'),
      scores: {
        moods: score(scores.moods, 'moods'),
        talk: score(scores.talk, 'talk'),
        love: score(scores.love, 'love'),
        dreams: score(scores.dreams, 'dreams'),
        overall: score(scores.overall, 'overall'),
      },
      highlights: highlights.map((h, i) => requireString(h, `highlights.${i}`, 80)),
    };
    if (!this.oracle.isConfigured()) return { reading: null };
    try {
      const reading = (await this.oracle.bondReading(input)).trim();
      return { reading: reading || null };
    } catch (error) {
      this.log(`lectura de compatibilidad no disponible: ${(error as Error).message}`);
      return { reading: null };
    }
  }
}
