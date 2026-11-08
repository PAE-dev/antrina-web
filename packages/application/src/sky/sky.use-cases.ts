import {
  type SkyBondDto,
  type SkyDataResponse,
  type SkyProfileDto,
  type SkyQuestionDto,
} from '@antrina/contracts';
import {
  assertBirthDate,
  assertBirthTime,
  assertPlace,
  type Clock,
  DomainError,
  SKY_LIMITS,
  SKY_TOPICS,
  type SkyPlace,
  type SkyProfile,
  type SkyRepository,
} from '@antrina/domain';
import { optionalString, requireOneOf, requireString } from '../shared/input.js';

function toProfileDto(profile: SkyProfile): SkyProfileDto {
  return { birthDate: profile.birthDate, birthTime: profile.birthTime, place: profile.place };
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DomainError(`El campo "${field}" debe ser un número`, 'input.invalid');
  }
  return value;
}

function parsePlace(value: unknown): SkyPlace | null {
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

/** Perfil, preguntas y vínculos de "Tu cielo" de la cuenta. */
export class GetSkyDataUseCase {
  constructor(private readonly sky: SkyRepository) {}

  async execute(customerId: string): Promise<SkyDataResponse> {
    const [profile, questions, bonds] = await Promise.all([
      this.sky.getProfile(customerId),
      this.sky.listQuestions(customerId, SKY_LIMITS.questions),
      this.sky.listBonds(customerId),
    ]);
    return {
      profile: profile ? toProfileDto(profile) : null,
      questions: questions.map((q): SkyQuestionDto => ({
        id: q.id,
        question: q.question,
        topic: q.topic,
        day: q.day,
      })),
      bonds: bonds.map((b): SkyBondDto => ({ id: b.id, name: b.name, birthDate: b.birthDate })),
    };
  }
}

export class SaveSkyProfileUseCase {
  constructor(
    private readonly sky: SkyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(customerId: string, body: unknown): Promise<SkyProfileDto> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const birthDate = requireString(raw.birthDate, 'birthDate', 10);
    assertBirthDate(birthDate, this.clock.now());
    const birthTime = optionalString(raw.birthTime, 'birthTime', 5);
    if (birthTime) assertBirthTime(birthTime);
    const place = parsePlace(raw.place);
    const saved = await this.sky.saveProfile(customerId, { birthDate, birthTime, place });
    return toProfileDto(saved);
  }
}

/** "Olvidar mis datos": borra perfil, preguntas y vínculos (la cuenta sigue). */
export class DeleteSkyDataUseCase {
  constructor(private readonly sky: SkyRepository) {}

  async execute(customerId: string): Promise<void> {
    await this.sky.deleteAll(customerId);
  }
}

export class AddSkyQuestionUseCase {
  constructor(
    private readonly sky: SkyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(customerId: string, body: unknown): Promise<SkyQuestionDto> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const question = requireString(raw.question, 'question', SKY_LIMITS.questionLength).trim();
    if (!question) throw new DomainError('Escribe tu pregunta', 'input.invalid');
    const topic = requireOneOf(raw.topic, SKY_TOPICS, 'topic');
    const day = requireString(raw.day, 'day', 10);
    assertBirthDate(day, this.clock.now());
    const saved = await this.sky.addQuestion(
      customerId,
      { question, topic, day },
      SKY_LIMITS.questions,
    );
    return { id: saved.id, question: saved.question, topic: saved.topic, day: saved.day };
  }
}

export class AddSkyBondUseCase {
  constructor(
    private readonly sky: SkyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(customerId: string, body: unknown): Promise<SkyBondDto> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const name = requireString(raw.name, 'name', SKY_LIMITS.nameLength).trim();
    if (!name) throw new DomainError('Escribe un nombre', 'input.invalid');
    const birthDate = requireString(raw.birthDate, 'birthDate', 10);
    assertBirthDate(birthDate, this.clock.now());
    if ((await this.sky.countBonds(customerId)) >= SKY_LIMITS.bonds) {
      throw new DomainError('Llegaste al máximo de vínculos guardados', 'sky.bonds_limit');
    }
    const bond = await this.sky.addBond(customerId, { name, birthDate });
    return { id: bond.id, name: bond.name, birthDate: bond.birthDate };
  }
}

export class DeleteSkyBondUseCase {
  constructor(private readonly sky: SkyRepository) {}

  async execute(customerId: string, bondId: string): Promise<void> {
    const deleted = await this.sky.deleteBond(customerId, bondId);
    if (!deleted) throw new DomainError('Vínculo no encontrado', 'sky.bond_not_found');
  }
}
