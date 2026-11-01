import { Module } from '@nestjs/common';
import {
  ClaimPieceUseCase,
  GetPieceUseCase,
  ListMyToritosUseCase,
  RecordToritoVisitUseCase,
  SavePieceGiftUseCase,
  UpdateToritoIntentionUseCase,
} from '@antrina/application';
import { type Clock, type ToritoRepository } from '@antrina/domain';
import { SystemClock } from '../admin-auth/infrastructure/crypto-session-token.service.js';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module.js';
import { PrismaToritoRepository } from './infrastructure/prisma-torito.repository.js';
import { ToritosController } from './presentation/toritos.controller.js';
import { TORITO_CLOCK, TORITO_REPOSITORY } from './toritos.tokens.js';

/** Vida digital de cada torito físico: QR, regalo, reclamo y establo. */
@Module({
  imports: [CustomerAuthModule],
  controllers: [ToritosController],
  providers: [
    { provide: TORITO_REPOSITORY, useClass: PrismaToritoRepository },
    { provide: TORITO_CLOCK, useClass: SystemClock },
    {
      provide: GetPieceUseCase,
      useFactory: (toritos: ToritoRepository) => new GetPieceUseCase(toritos),
      inject: [TORITO_REPOSITORY],
    },
    {
      provide: SavePieceGiftUseCase,
      useFactory: (toritos: ToritoRepository, clock: Clock) =>
        new SavePieceGiftUseCase(toritos, clock),
      inject: [TORITO_REPOSITORY, TORITO_CLOCK],
    },
    {
      provide: ClaimPieceUseCase,
      useFactory: (toritos: ToritoRepository) => new ClaimPieceUseCase(toritos),
      inject: [TORITO_REPOSITORY],
    },
    {
      provide: ListMyToritosUseCase,
      useFactory: (toritos: ToritoRepository) => new ListMyToritosUseCase(toritos),
      inject: [TORITO_REPOSITORY],
    },
    {
      provide: UpdateToritoIntentionUseCase,
      useFactory: (toritos: ToritoRepository) => new UpdateToritoIntentionUseCase(toritos),
      inject: [TORITO_REPOSITORY],
    },
    {
      provide: RecordToritoVisitUseCase,
      useFactory: (toritos: ToritoRepository, clock: Clock) =>
        new RecordToritoVisitUseCase(toritos, clock),
      inject: [TORITO_REPOSITORY, TORITO_CLOCK],
    },
  ],
})
export class ToritosModule {}
