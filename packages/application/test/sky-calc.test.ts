import { type SkyBirthRequest } from '@antrina/contracts';
import { chartFromBirth, synastry } from '@antrina/sky';
import { describe, expect, it } from 'vitest';
import {
  GetNatalChartUseCase,
  GetSkyDailyUseCase,
  GetSkyRankingUseCase,
  GetSynastryUseCase,
} from '../src/index.js';
import { FakeClock } from './fakes.js';

// 03:00 UTC del 8 de noviembre: en Lima (UTC−5) todavía es el 7.
const clock = new FakeClock(new Date('2026-11-08T03:00:00Z'));

const lima = {
  name: 'Lima',
  region: 'Lima',
  country: 'Perú',
  lat: -12.0464,
  lon: -77.0428,
  timezone: 'America/Lima',
};

const withPlace: SkyBirthRequest = { birthDate: '1990-06-15', birthTime: '08:30', place: lima };
const dateOnly: SkyBirthRequest = { birthDate: '1992-12-03', birthTime: null, place: null };

function expectCode(run: () => unknown, code: string): void {
  expect(run).toThrow(expect.objectContaining({ code }));
}

describe('carta natal', () => {
  const useCase = new GetNatalChartUseCase(clock);

  it('con hora y lugar calcula ascendente y las 12 casas', () => {
    const chart = useCase.execute(withPlace);
    expect(chart.sun).toBe('GEMINI');
    expect(chart.placements).toHaveLength(10);
    expect(chart.ascendant?.point).toBe('ascendant');
    expect(chart.rising).toBe(chart.ascendant?.sign);
    expect(chart.cusps).toHaveLength(12);
    expect(chart.placements.every((p) => p.house !== null && p.house >= 1 && p.house <= 12)).toBe(
      true,
    );
  });

  it('sin hora no hay ascendente ni casas', () => {
    const chart = useCase.execute({ ...withPlace, birthTime: null });
    expect(chart.ascendant).toBeNull();
    expect(chart.rising).toBeNull();
    expect(chart.cusps).toBeNull();
    expect(chart.placements.every((p) => p.house === null)).toBe(true);
  });

  it('da lo mismo que la tienda (mismo paquete @antrina/sky)', () => {
    const chart = useCase.execute(withPlace);
    const web = chartFromBirth({ date: '1990-06-15', time: '08:30', place: lima });
    expect(chart.placements).toEqual(web.placements);
    expect(chart.cusps).toEqual(web.cusps);
  });

  it('sin lugar usa la zona indicada (por defecto Lima)', () => {
    const inLima = useCase.execute({ ...dateOnly, birthTime: '23:30' });
    const inTokyo = useCase.execute({ ...dateOnly, birthTime: '23:30', timezone: 'Asia/Tokyo' });
    const moonOf = (chart: typeof inLima) =>
      chart.placements.find((p) => p.point === 'moon')!.longitude;
    expect(moonOf(inLima)).not.toBe(moonOf(inTokyo));
  });

  it('rechaza fechas, horas y zonas inválidas', () => {
    expectCode(() => useCase.execute({ ...dateOnly, birthDate: '2026-02-31' }), 'sky.invalid_date');
    expectCode(() => useCase.execute({ ...dateOnly, birthDate: '2030-01-01' }), 'sky.invalid_date');
    expectCode(() => useCase.execute({ ...dateOnly, birthTime: '25:00' }), 'sky.invalid_time');
    expectCode(
      () => useCase.execute({ ...dateOnly, timezone: 'Marte/Olympus' }),
      'sky.invalid_place',
    );
    expectCode(() => useCase.execute(null), 'input.invalid');
  });
});

describe('compatibilidad', () => {
  const useCase = new GetSynastryUseCase(clock);

  it('calcula las 4 áreas y arma la lectura con el nombre', () => {
    const result = useCase.execute({ locale: 'es', me: withPlace, them: dateOnly, name: 'Ana' });
    expect(result.rows.map((row) => row.area)).toEqual(['moods', 'talk', 'love', 'dreams']);
    expect(result.percent).toBeGreaterThanOrEqual(15);
    expect(result.percent).toBeLessThanOrEqual(97);
    expect(result.reading).toContain('Ana');
    const web = synastry(
      chartFromBirth({ date: '1990-06-15', time: '08:30', place: lima }),
      chartFromBirth({ date: '1992-12-03', time: null, place: null }, 'America/Lima'),
      'es',
    );
    expect(result.percent).toBe(web.percent);
    expect(result.highlights).toEqual(web.highlights);
  });

  it('escribe en inglés y sin nombre usa uno genérico', () => {
    const result = useCase.execute({ locale: 'en', me: withPlace, them: dateOnly });
    expect(result.reading).toContain('that person');
  });

  it('exige las dos personas', () => {
    expectCode(() => useCase.execute({ locale: 'es', me: withPlace }), 'input.invalid');
  });
});

describe('ranking del día', () => {
  const useCase = new GetSkyRankingUseCase(clock);

  it('por defecto es hoy en hora de Lima, con los 12 signos y sus textos', () => {
    const result = useCase.execute({ locale: 'es' });
    expect(result.day).toBe('2026-11-07');
    expect(result.ranking.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(result.ranking.map((r) => r.sign)).size).toBe(12);
    expect(result.ranking[0]!.tier).toBe('high');
    expect(result.ranking[11]!.tier).toBe('low');
    for (const rank of result.ranking) {
      expect(rank.phrase.length).toBeGreaterThan(0);
      expect(rank.color.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(rank.stone.name.length).toBeGreaterThan(0);
    }
    expect(result.sky.illumination).toBeGreaterThanOrEqual(0);
    expect(result.sky.illumination).toBeLessThanOrEqual(1);
  });

  it('es determinista y cambia con el día', () => {
    const a = useCase.execute({ day: '2026-01-01', locale: 'en' });
    expect(useCase.execute({ day: '2026-01-01', locale: 'en' })).toEqual(a);
    const b = useCase.execute({ day: '2026-01-02', locale: 'en' });
    expect(b.ranking.map((r) => r.sign)).not.toEqual(a.ranking.map((r) => r.sign));
  });

  it('rechaza días inválidos', () => {
    expectCode(() => useCase.execute({ day: '2026-13-01' }), 'sky.invalid_day');
    expectCode(() => useCase.execute({ day: 'hoy' }), 'sky.invalid_day');
  });
});

describe('el día de una persona', () => {
  const useCase = new GetSkyDailyUseCase(clock);

  it('une ranking, índices, aliado y cuarzo de la suerte del signo solar', () => {
    const result = useCase.execute({
      locale: 'es',
      birth: withPlace,
      day: '2026-11-07',
      seed: 'x1',
    });
    expect(result.me.sign).toBe('GEMINI');
    expect(result.me.rank).toEqual(result.ranking.find((r) => r.sign === 'GEMINI'));
    expect(result.me.ally).not.toBe('GEMINI');
    expect(Object.keys(result.me.indices).sort()).toEqual(['energy', 'love', 'money', 'work']);
    expect(result.me.fortune.stoneId).toBe(result.me.rank.stone.id);
    expect(result.me.fortune.verse.length).toBeGreaterThan(0);
    expect(['bright', 'steady', 'calm']).toContain(result.me.tone);
  });

  it('rechaza una semilla con caracteres raros', () => {
    expectCode(
      () => useCase.execute({ locale: 'es', birth: withPlace, seed: '<script>' }),
      'input.invalid',
    );
  });
});
