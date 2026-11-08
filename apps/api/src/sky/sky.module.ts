import { Module } from '@nestjs/common';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetSkyDataUseCase,
  SaveSkyProfileUseCase,
} from '@antrina/application';
import { type Clock, type SkyRepository } from '@antrina/domain';
import { SystemClock } from '../admin-auth/infrastructure/crypto-session-token.service.js';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module.js';
import { PrismaSkyRepository } from './infrastructure/prisma-sky.repository.js';
import { SkyController } from './presentation/sky.controller.js';
import { SKY_CLOCK, SKY_REPOSITORY } from './sky.tokens.js';

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

/** "Tu cielo" (astrología y cuarzos) guardado en la cuenta de Google del cliente. */
@Module({
  imports: [CustomerAuthModule],
  controllers: [SkyController],
  providers: [
    { provide: SKY_REPOSITORY, useClass: PrismaSkyRepository },
    { provide: SKY_CLOCK, useClass: SystemClock },
    skyUseCase(GetSkyDataUseCase),
    skyUseCase(DeleteSkyDataUseCase),
    skyUseCase(DeleteSkyBondUseCase),
    skyClockUseCase(SaveSkyProfileUseCase),
    skyClockUseCase(AddSkyQuestionUseCase),
    skyClockUseCase(AddSkyBondUseCase),
  ],
})
export class SkyModule {}
