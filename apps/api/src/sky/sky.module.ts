import { Logger, Module } from '@nestjs/common';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  AskSkyUseCase,
  BondReadingUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetNatalChartUseCase,
  GetSkyDailyUseCase,
  GetSkyDataUseCase,
  GetSkyRankingUseCase,
  GetSynastryUseCase,
  MarkSkyDayUseCase,
  SaveSkyProfileUseCase,
} from '@antrina/application';
import { type Clock, type SkyOracle, type SkyRepository } from '@antrina/domain';
import { SystemClock } from '../admin-auth/infrastructure/crypto-session-token.service.js';
import { AskRateLimitGuard } from './presentation/ask-rate-limit.guard.js';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module.js';
import { OpenRouterSkyOracle } from './infrastructure/openrouter-sky-oracle.js';
import { PrismaSkyRepository } from './infrastructure/prisma-sky.repository.js';
import { SkyCalcController } from './presentation/sky-calc.controller.js';
import { AskSkyController, SkyController } from './presentation/sky.controller.js';
import { SKY_CLOCK, SKY_ORACLE, SKY_REPOSITORY } from './sky.tokens.js';

const skyUseCase = <T>(UseCase: new (sky: SkyRepository) => T) => ({
  provide: UseCase,
  useFactory: (sky: SkyRepository) => new UseCase(sky),
  inject: [SKY_REPOSITORY],
});

const skyClockUseCase = <T>(UseCase: new (sky: SkyRepository, clock: Clock) => T) => ({
  provide: UseCase,
  useFactory: (sky: SkyRepository, clock: Clock) => new UseCase(sky, clock),
  inject: [SKY_REPOSITORY, SKY_CLOCK],
});

const clockUseCase = <T>(UseCase: new (clock: Clock) => T) => ({
  provide: UseCase,
  useFactory: (clock: Clock) => new UseCase(clock),
  inject: [SKY_CLOCK],
});

/**
 * "Tu cielo" (astrología y cuarzos): lo guardado en la cuenta de Google del cliente y los cálculos
 * sin sesión (`@antrina/sky`) para la app móvil.
 */
@Module({
  imports: [CustomerAuthModule],
  controllers: [SkyCalcController, SkyController, AskSkyController],
  providers: [
    { provide: SKY_REPOSITORY, useClass: PrismaSkyRepository },
    { provide: SKY_CLOCK, useClass: SystemClock },
    { provide: SKY_ORACLE, useClass: OpenRouterSkyOracle },
    {
      provide: AskSkyUseCase,
      useFactory: (oracle: SkyOracle) => {
        const logger = new Logger('AskSky');
        return new AskSkyUseCase(oracle, (message) => logger.warn(message));
      },
      inject: [SKY_ORACLE],
    },
    {
      provide: BondReadingUseCase,
      useFactory: (oracle: SkyOracle) => {
        const logger = new Logger('BondReading');
        return new BondReadingUseCase(oracle, (message) => logger.warn(message));
      },
      inject: [SKY_ORACLE],
    },
    AskRateLimitGuard,
    skyUseCase(GetSkyDataUseCase),
    skyUseCase(DeleteSkyDataUseCase),
    skyUseCase(DeleteSkyBondUseCase),
    skyClockUseCase(SaveSkyProfileUseCase),
    skyClockUseCase(AddSkyQuestionUseCase),
    skyClockUseCase(AddSkyBondUseCase),
    skyClockUseCase(MarkSkyDayUseCase),
    clockUseCase(GetNatalChartUseCase),
    clockUseCase(GetSynastryUseCase),
    clockUseCase(GetSkyDailyUseCase),
    clockUseCase(GetSkyRankingUseCase),
  ],
})
export class SkyModule {}
