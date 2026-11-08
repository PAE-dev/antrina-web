import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  GetNatalChartUseCase,
  GetSkyDailyUseCase,
  GetSkyRankingUseCase,
  GetSynastryUseCase,
} from '@antrina/application';
import {
  type NatalChartResponse,
  type SkyDailyResponse,
  type SkyRankingResponse,
  type SynastryResponse,
} from '@antrina/contracts';
import { secondsToLimaMidnight } from '@antrina/sky';
import { type Response } from 'express';

/**
 * Cálculos de "Tu cielo" sin sesión (`@antrina/sky`, los mismos de la tienda) para la app móvil.
 * No guardan nada: la cuenta sigue en `SkyController`.
 */
@Controller('cielo-api/sky')
export class SkyCalcController {
  constructor(
    @Inject(GetNatalChartUseCase) private readonly natalChart: GetNatalChartUseCase,
    @Inject(GetSynastryUseCase) private readonly synastry: GetSynastryUseCase,
    @Inject(GetSkyDailyUseCase) private readonly daily: GetSkyDailyUseCase,
    @Inject(GetSkyRankingUseCase) private readonly ranking: GetSkyRankingUseCase,
  ) {}

  @Post('chart')
  @HttpCode(HttpStatus.OK)
  chart(@Body() body: unknown): NatalChartResponse {
    return this.natalChart.execute(body);
  }

  @Post('synastry')
  @HttpCode(HttpStatus.OK)
  bond(@Body() body: unknown): SynastryResponse {
    return this.synastry.execute(body);
  }

  @Post('daily')
  @HttpCode(HttpStatus.OK)
  day(@Body() body: unknown): SkyDailyResponse {
    return this.daily.execute(body);
  }

  /** El mismo para todos: la CDN lo guarda hasta la medianoche de Lima (solo el de hoy). */
  @Get('ranking')
  todayRanking(
    @Res({ passthrough: true }) response: Response,
    @Query('day') day?: string,
    @Query('locale') locale?: string,
  ): SkyRankingResponse {
    const result = this.ranking.execute({ day, locale });
    const maxAge = day ? 3600 : secondsToLimaMidnight();
    response.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=60`);
    return result;
  }
}
