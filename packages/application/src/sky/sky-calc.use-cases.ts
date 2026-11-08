import {
  type NatalChartResponse,
  type SkyDailyResponse,
  type SkyPlacementDto,
  type SkyRankedSignDto,
  type SkyRankingResponse,
  type SynastryResponse,
} from '@antrina/contracts';
import { type Clock, DomainError, type Locale, resolveLocale } from '@antrina/domain';
import {
  bondFallback,
  chartFromBirth,
  dailyAlly,
  dayProfile,
  FORTUNE_LEVEL_LABEL,
  FORTUNE_VERSES,
  fortuneFor,
  limaDay,
  LUCKY_COLORS,
  LUCKY_ITEMS,
  moonCycle,
  type NatalChart,
  type Placement,
  RANK_PHRASES,
  type RankedSign,
  rankingFor,
  skyOfDay,
  STONE_LIBRARY,
  synastry,
  transitsFor,
} from '@antrina/sky';
import { optionalString } from '../shared/input.js';
import { parseBirth, type ParsedBirth, parseSkyDay } from './sky-input.js';

/*
 * "Tu cielo" calculado en la API con `@antrina/sky`, el mismo paquete que usa la tienda en el
 * navegador: la app móvil recibe los mismos resultados sin duplicar las fórmulas. Sin sesión ni
 * base de datos; todo es determinista.
 */

const chartOf = (birth: ParsedBirth): NatalChart =>
  chartFromBirth({ date: birth.date, time: birth.time, place: birth.place }, birth.timeZone);

const toPlacementDto = (placement: Placement): SkyPlacementDto => ({ ...placement });

const signAt = (chart: NatalChart, point: string) =>
  chart.placements.find((placement) => placement.point === point)!.sign;

/** Mediodía local de un día (las funciones del cielo leen la fecha en hora local). */
const localNoon = (day: string) => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
};

function toRankedDto(rank: RankedSign, locale: Locale): SkyRankedSignDto {
  const color = LUCKY_COLORS[rank.colorIndex]!;
  const stone = STONE_LIBRARY[rank.stoneId]!;
  return {
    sign: rank.sign,
    position: rank.position,
    score: rank.score,
    tier: rank.tier,
    phrase: RANK_PHRASES[rank.tier][locale][rank.phraseIndex]!,
    color: { hex: color.hex, name: color.name[locale] },
    number: rank.number,
    hour: rank.hour,
    item: LUCKY_ITEMS[locale][rank.itemIndex]!,
    stone: { id: stone.id, name: stone.name[locale] },
  };
}

function rankingOf(day: string, raw: RankedSign[], locale: Locale): SkyRankingResponse {
  const noon = localNoon(day);
  return {
    day,
    sky: { ...skyOfDay(noon), ...moonCycle(noon) },
    ranking: raw.map((rank) => toRankedDto(rank, locale)),
  };
}

const bodyOf = (body: unknown) => (body ?? {}) as Record<string, unknown>;

/** Carta natal: planetas, ascendente y casas (con hora y lugar). */
export class GetNatalChartUseCase {
  constructor(private readonly clock: Clock) {}

  execute(body: unknown): NatalChartResponse {
    const chart = chartOf(parseBirth(body, this.clock.now(), 'body'));
    return {
      sun: signAt(chart, 'sun'),
      moon: signAt(chart, 'moon'),
      rising: chart.ascendant?.sign ?? null,
      placements: chart.placements.map(toPlacementDto),
      ascendant: chart.ascendant ? toPlacementDto(chart.ascendant) : null,
      cusps: chart.cusps,
    };
  }
}

/** Compatibilidad entre dos cartas, con su lectura sin IA. */
export class GetSynastryUseCase {
  constructor(private readonly clock: Clock) {}

  execute(body: unknown): SynastryResponse {
    const raw = bodyOf(body);
    const locale = resolveLocale(raw.locale);
    const now = this.clock.now();
    const result = synastry(
      chartOf(parseBirth(raw.me, now, 'me')),
      chartOf(parseBirth(raw.them, now, 'them')),
      locale,
    );
    const name =
      optionalString(raw.name, 'name', 40)?.trim() ||
      (locale === 'es' ? 'esa persona' : 'that person');
    return {
      percent: result.percent,
      rows: result.rows,
      highlights: result.highlights,
      reading: bondFallback(result, name, locale),
    };
  }
}

/** Ranking de los 12 signos de un día (por defecto hoy, en hora de Lima). */
export class GetSkyRankingUseCase {
  constructor(private readonly clock: Clock) {}

  execute(input: { day?: unknown; locale?: unknown }): SkyRankingResponse {
    const day = parseSkyDay(input.day, limaDay(this.clock.now()));
    return rankingOf(day, rankingFor(day), resolveLocale(input.locale));
  }
}

/** El día de una persona: ranking, índices por área, aliado, cuarzo de la suerte y tránsito. */
export class GetSkyDailyUseCase {
  constructor(private readonly clock: Clock) {}

  execute(body: unknown): SkyDailyResponse {
    const raw = bodyOf(body);
    const now = this.clock.now();
    const locale = resolveLocale(raw.locale);
    const day = parseSkyDay(raw.day, limaDay(now));
    const chart = chartOf(parseBirth(raw.birth, now));
    const seed = optionalString(raw.seed, 'seed', 64) ?? 'antrina';
    if (!/^[\w-]+$/.test(seed)) throw new DomainError('Semilla inválida', 'input.invalid');

    const rawRanking = rankingFor(day);
    const profile = dayProfile(chart, day, rawRanking);
    const fortune = fortuneFor(day, seed, profile);
    const transit = transitsFor(chart, localNoon(day))[0] ?? null;
    return {
      ...rankingOf(day, rawRanking, locale),
      me: {
        sign: profile.rank.sign,
        rank: toRankedDto(profile.rank, locale),
        indices: profile.indices,
        score: profile.score,
        tone: profile.tone,
        best: profile.best,
        worst: profile.worst,
        ally: dailyAlly(profile.rank.sign, rawRanking),
        fortune: {
          level: fortune.level,
          label: FORTUNE_LEVEL_LABEL[fortune.level][locale],
          verseIndex: fortune.verseIndex,
          verse: FORTUNE_VERSES[fortune.level][locale][fortune.verseIndex]!,
          stoneId: fortune.stoneId,
        },
        transit,
      },
    };
  }
}
