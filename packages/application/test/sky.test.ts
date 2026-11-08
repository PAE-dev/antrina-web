import {
  type DomainError,
  type SkyBond,
  type SkyDay,
  type SkyDayPatch,
  type SkyProfile,
  type SkyProfileInput,
  type SkyQuestion,
  type SkyRepository,
  type SkyTopic,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  AskSkyUseCase,
  BondReadingUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetSkyDataUseCase,
  MarkSkyDayUseCase,
  SaveSkyProfileUseCase,
} from '../src/index.js';
import { FakeClock } from './fakes.js';

class InMemorySky implements SkyRepository {
  profiles = new Map<string, SkyProfile>();
  questions: (SkyQuestion & { customerId: string })[] = [];
  bonds: (SkyBond & { customerId: string })[] = [];
  days = new Map<string, SkyDay>();
  private seq = 0;
  async listDays(customerId: string, limit: number) {
    return [...this.days.entries()]
      .filter(([k]) => k.startsWith(`${customerId}|`))
      .map(([, v]) => v)
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, limit);
  }
  async markDay(customerId: string, day: string, patch: SkyDayPatch) {
    const key = `${customerId}|${day}`;
    const prev = this.days.get(key) ?? {
      day,
      rankingSeen: false,
      ritualDone: false,
      fortune: null,
    };
    const next: SkyDay = {
      day,
      rankingSeen: prev.rankingSeen || !!patch.rankingSeen,
      ritualDone: prev.ritualDone || !!patch.ritualDone,
      fortune: prev.fortune ?? patch.fortune ?? null,
    };
    this.days.set(key, next);
    return next;
  }
  async getProfile(customerId: string) {
    return this.profiles.get(customerId) ?? null;
  }
  async saveProfile(customerId: string, input: SkyProfileInput) {
    const profile = { customerId, ...input, updatedAt: new Date() };
    this.profiles.set(customerId, profile);
    return profile;
  }
  async deleteAll(customerId: string) {
    this.profiles.delete(customerId);
    this.questions = this.questions.filter((q) => q.customerId !== customerId);
    this.bonds = this.bonds.filter((b) => b.customerId !== customerId);
  }
  async listQuestions(customerId: string, limit: number) {
    return this.questions.filter((q) => q.customerId === customerId).slice(0, limit);
  }
  async addQuestion(
    customerId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ) {
    this.questions = this.questions.filter(
      (q) => !(q.customerId === customerId && q.question === input.question),
    );
    const q = { id: `q-${++this.seq}`, customerId, ...input, createdAt: new Date() };
    this.questions.unshift(q);
    const mine = this.questions.filter((x) => x.customerId === customerId);
    const drop = new Set(mine.slice(keep).map((x) => x.id));
    this.questions = this.questions.filter((x) => !drop.has(x.id));
    return q;
  }
  async listBonds(customerId: string) {
    return this.bonds.filter((b) => b.customerId === customerId);
  }
  async countBonds(customerId: string) {
    return this.bonds.filter((b) => b.customerId === customerId).length;
  }
  async addBond(customerId: string, input: { name: string; birthDate: string }) {
    const b = { id: `b-${++this.seq}`, customerId, ...input, createdAt: new Date() };
    this.bonds.push(b);
    return b;
  }
  async deleteBond(customerId: string, bondId: string) {
    const before = this.bonds.length;
    this.bonds = this.bonds.filter((b) => !(b.id === bondId && b.customerId === customerId));
    return this.bonds.length < before;
  }
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

const LIMA = {
  name: 'Lima',
  region: 'Lima',
  country: 'Perú',
  lat: -12.05,
  lon: -77.04,
  timezone: 'America/Lima',
};

describe('Tu cielo guardado en la cuenta', () => {
  let sky: InMemorySky;
  let clock: FakeClock;

  beforeEach(() => {
    sky = new InMemorySky();
    clock = new FakeClock();
  });

  it('guarda y lee el perfil validado', async () => {
    await new SaveSkyProfileUseCase(sky, clock).execute('c1', {
      birthDate: '1998-05-17',
      birthTime: '03:22',
      place: LIMA,
    });
    const data = await new GetSkyDataUseCase(sky).execute('c1');
    expect(data.profile).toEqual({ birthDate: '1998-05-17', birthTime: '03:22', place: LIMA });
  });

  it('acepta perfil sin hora ni lugar', async () => {
    const saved = await new SaveSkyProfileUseCase(sky, clock).execute('c1', {
      birthDate: '1990-01-01',
      birthTime: null,
      place: null,
    });
    expect(saved).toEqual({ birthDate: '1990-01-01', birthTime: null, place: null });
  });

  it('rechaza fechas, horas y lugares imposibles', async () => {
    const save = new SaveSkyProfileUseCase(sky, clock);
    await expectCode(save.execute('c', { birthDate: '2026-02-31' }), 'sky.invalid_date');
    await expectCode(save.execute('c', { birthDate: '2099-01-01' }), 'sky.invalid_date');
    await expectCode(save.execute('c', { birthDate: '1850-01-01' }), 'sky.invalid_date');
    await expectCode(
      save.execute('c', { birthDate: '1990-01-01', birthTime: '25:00' }),
      'sky.invalid_time',
    );
    await expectCode(
      save.execute('c', { birthDate: '1990-01-01', place: { ...LIMA, lat: 200 } }),
      'sky.invalid_place',
    );
    await expectCode(
      save.execute('c', { birthDate: '1990-01-01', place: { ...LIMA, timezone: '../etc' } }),
      'sky.invalid_place',
    );
  });

  it('guarda preguntas sin repetir y conserva las 20 más recientes', async () => {
    const add = new AddSkyQuestionUseCase(sky, clock);
    for (let i = 0; i < 25; i++) {
      await add.execute('c', { question: `¿Pregunta ${i}?`, topic: 'love', day: '2026-10-04' });
    }
    await add.execute('c', { question: '¿Pregunta 3?', topic: 'love', day: '2026-10-04' });
    const data = await new GetSkyDataUseCase(sky).execute('c');
    expect(data.questions).toHaveLength(20);
    expect(data.questions[0]?.question).toBe('¿Pregunta 3?');
    await expectCode(
      add.execute('c', { question: 'x', topic: 'nope', day: '2026-10-04' }),
      'input.invalid',
    );
    await expectCode(
      add.execute('c', { question: '   ', topic: 'love', day: '2026-10-04' }),
      'input.invalid',
    );
  });

  it('limita los vínculos y solo borra los propios', async () => {
    const addBond = new AddSkyBondUseCase(sky, clock);
    const bond = await addBond.execute('a', { name: ' Sol ', birthDate: '1995-03-02' });
    expect(bond.name).toBe('Sol');
    const remove = new DeleteSkyBondUseCase(sky);
    await expectCode(remove.execute('otra', bond.id), 'sky.bond_not_found');
    await remove.execute('a', bond.id);
    expect(sky.bonds).toHaveLength(0);

    for (let i = 0; i < 30; i++) {
      await addBond.execute('a', { name: `P${i}`, birthDate: '1995-03-02' });
    }
    await expectCode(
      addBond.execute('a', { name: 'Una más', birthDate: '1995-03-02' }),
      'sky.bonds_limit',
    );
  });

  it('olvidar borra todo lo de ese cliente y nada de otros', async () => {
    const save = new SaveSkyProfileUseCase(sky, clock);
    await save.execute('a', { birthDate: '1990-01-01' });
    await save.execute('b', { birthDate: '1991-01-01' });
    await new AddSkyBondUseCase(sky, clock).execute('a', { name: 'X', birthDate: '1990-01-01' });
    await new DeleteSkyDataUseCase(sky).execute('a');
    expect(await sky.getProfile('a')).toBeNull();
    expect(await sky.getProfile('b')).not.toBeNull();
    expect(sky.bonds).toHaveLength(0);
  });
});

describe('Pregunta al cielo con IA', () => {
  const body = {
    question: '¿Estoy bien?',
    topic: 'self',
    locale: 'es',
    sun: 'Tauro',
    moon: 'Acuario',
    ascendant: null,
    transit: 'Venus en tránsito trígono a tu Sol natal',
    stone: { name: 'Jade', meaning: 'Se asocia con la serenidad.' },
  };
  const oracle = (impl: () => Promise<string>, configured = true) => {
    const calls: unknown[] = [];
    return {
      calls,
      isConfigured: () => configured,
      answer: async (input: unknown) => {
        calls.push(input);
        return impl();
      },
      bondReading: async (input: unknown) => {
        calls.push(input);
        return impl();
      },
    };
  };

  it('devuelve la respuesta del modelo con el contexto validado', async () => {
    const o = oracle(async () => '  Respira hondo.  ');
    const result = await new AskSkyUseCase(o).execute(body);
    expect(result.answer).toBe('Respira hondo.');
    expect(o.calls[0]).toMatchObject({ sun: 'Tauro', stone: { name: 'Jade' } });
  });

  it('sin clave o si el modelo falla, responde null (la app usa sus textos)', async () => {
    const off = oracle(async () => 'x', false);
    expect((await new AskSkyUseCase(off).execute(body)).answer).toBeNull();
    expect(off.calls).toHaveLength(0);
    const logs: string[] = [];
    const failing = oracle(async () => {
      throw new Error('timeout');
    });
    expect((await new AskSkyUseCase(failing, (m) => logs.push(m)).execute(body)).answer).toBeNull();
    expect(logs[0]).toContain('timeout');
  });

  it('valida la pregunta antes de gastar una llamada', async () => {
    const o = oracle(async () => 'x');
    const ask = new AskSkyUseCase(o);
    await expectCode(ask.execute({ ...body, question: '   ' }), 'input.invalid');
    await expectCode(ask.execute({ ...body, question: 'a'.repeat(141) }), 'input.invalid');
    await expectCode(ask.execute({ ...body, locale: 'fr' }), 'input.invalid');
    expect(o.calls).toHaveLength(0);
  });
});

describe('Días de Tu cielo (racha, ranking, ritual y papel)', () => {
  it('marca el día sin desmarcar lo hecho y guarda el primer papel', async () => {
    const sky = new InMemorySky();
    const clock = new FakeClock(new Date('2026-11-08T15:00:00Z'));
    const mark = new MarkSkyDayUseCase(sky, clock);
    await mark.execute('c', '2026-11-08', {});
    await mark.execute('c', '2026-11-08', { rankingSeen: true });
    await mark.execute('c', '2026-11-08', {
      fortune: { level: 'great', verseIndex: 1, stoneId: 'jade' },
    });
    const again = await mark.execute('c', '2026-11-08', {
      ritualDone: true,
      fortune: { level: 'serene', verseIndex: 2, stoneId: 'citrino' },
    });
    expect(again).toEqual({
      day: '2026-11-08',
      rankingSeen: true,
      ritualDone: true,
      fortune: { level: 'great', verseIndex: 1, stoneId: 'jade' },
    });
    const data = await new GetSkyDataUseCase(sky).execute('c');
    expect(data.days).toHaveLength(1);
  });

  it('solo acepta hoy (con margen de zona horaria) y papeles válidos', async () => {
    const sky = new InMemorySky();
    const mark = new MarkSkyDayUseCase(sky, new FakeClock(new Date('2026-11-08T15:00:00Z')));
    await expectCode(mark.execute('c', '2026-10-01', {}), 'sky.invalid_day');
    await expectCode(mark.execute('c', '2026-11-20', {}), 'sky.invalid_day');
    await expectCode(mark.execute('c', 'ayer', {}), 'sky.invalid_day');
    await expectCode(
      mark.execute('c', '2026-11-08', {
        fortune: { level: 'mala', verseIndex: 0, stoneId: 'jade' },
      }),
      'input.invalid',
    );
    await expectCode(
      mark.execute('c', '2026-11-08', {
        fortune: { level: 'good', verseIndex: 0, stoneId: '../x' },
      }),
      'input.invalid',
    );
    await mark.execute('c', '2026-11-07', { rankingSeen: true });
  });
});

describe('Lectura de compatibilidad con IA', () => {
  const body = {
    locale: 'es',
    me: { name: 'Tú', sun: 'Tauro', moon: 'Acuario', venus: 'Aries', mars: 'Géminis' },
    them: { name: 'Ana', sun: 'Leo', moon: 'Piscis', venus: 'Cáncer', mars: 'Virgo' },
    scores: { moods: 62, talk: 48, love: 81, dreams: 70, overall: 65 },
    highlights: ['Tu Venus en armonía con su Marte'],
  };
  it('pasa la sinastría validada al modelo y devuelve su lectura', async () => {
    const calls: unknown[] = [];
    const oracle = {
      isConfigured: () => true,
      answer: async () => '',
      bondReading: async (input: unknown) => {
        calls.push(input);
        return ' Una lectura. ';
      },
    };
    expect((await new BondReadingUseCase(oracle).execute(body)).reading).toBe('Una lectura.');
    expect(calls[0]).toMatchObject({ them: { name: 'Ana' }, scores: { love: 81 } });
  });
  it('valida puntajes y responde null sin IA', async () => {
    const off = { isConfigured: () => false, answer: async () => '', bondReading: async () => 'x' };
    expect((await new BondReadingUseCase(off).execute(body)).reading).toBeNull();
    await expectCode(
      new BondReadingUseCase(off).execute({ ...body, scores: { ...body.scores, love: 140 } }),
      'input.invalid',
    );
  });
});
