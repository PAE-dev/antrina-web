import { type AskSkyResponse } from '@antrina/contracts';
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
