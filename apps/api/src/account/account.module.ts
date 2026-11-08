import { Module } from '@nestjs/common';
import {
  AddSkyBondUseCase,
  AddSkyQuestionUseCase,
  DeleteSkyBondUseCase,
  DeleteSkyDataUseCase,
  GetCurrentAccountUseCase,
  GetSkyDataUseCase,
  ListMyOrdersUseCase,
  SaveSkyProfileUseCase,
  SignInWithGoogleUseCase,
  SignOutAccountUseCase,
} from '@antrina/application';
import {
  type Clock,
  type CustomerAccountRepository,
  type CustomerSessionStore,
  type IdentityProvider,
  type OrderRepository,
  type SessionTokenService,
  type SkyRepository,
} from '@antrina/domain';
import {
  CryptoSessionTokenService,
  SystemClock,
} from '../admin-auth/infrastructure/crypto-session-token.service.js';
import { AuthRateLimitGuard } from '../admin-auth/presentation/admin.guards.js';
import { PrismaOrderRepository } from '../admin-sales/infrastructure/prisma-order.repository.js';
import {
  ACCOUNT_CLOCK,
  ACCOUNT_ORDER_REPOSITORY,
  ACCOUNT_TOKENS,
  CUSTOMER_ACCOUNT_REPOSITORY,
  CUSTOMER_SESSION_STORE,
  IDENTITY_PROVIDER,
  SKY_REPOSITORY,
} from './account.tokens.js';
import { GoogleIdentityProvider } from './infrastructure/google-identity.provider.js';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerSessionStore,
  PrismaSkyRepository,
} from './infrastructure/prisma-account.repositories.js';
import { AccountAuthController } from './presentation/account-auth.controller.js';
import { AccountOriginGuard, AccountSessionGuard } from './presentation/account.guards.js';
import { MeController } from './presentation/me.controller.js';

const skyUseCase = <T>(UseCase: new (sky: SkyRepository) => T) => ({
  provide: UseCase,
  useFactory: (sky: SkyRepository) => new UseCase(sky),
  inject: [SKY_REPOSITORY],
});

const skyClockUseCase = <T>(UseCase: new (sky: SkyRepository, clock: Clock) => T) => ({
  provide: UseCase,
  useFactory: (sky: SkyRepository, clock: Clock) => new UseCase(sky, clock),
  inject: [SKY_REPOSITORY, ACCOUNT_CLOCK],
});

/** Cuentas de cliente: acceso con Google, sesión de todo el sitio, Tu cielo guardado y compras. */
@Module({
  controllers: [AccountAuthController, MeController],
  providers: [
    { provide: CUSTOMER_ACCOUNT_REPOSITORY, useClass: PrismaCustomerAccountRepository },
    { provide: CUSTOMER_SESSION_STORE, useClass: PrismaCustomerSessionStore },
    { provide: SKY_REPOSITORY, useClass: PrismaSkyRepository },
    { provide: IDENTITY_PROVIDER, useClass: GoogleIdentityProvider },
    { provide: ACCOUNT_ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: ACCOUNT_TOKENS, useClass: CryptoSessionTokenService },
    { provide: ACCOUNT_CLOCK, useClass: SystemClock },
    {
      provide: SignInWithGoogleUseCase,
      useFactory: (
        accounts: CustomerAccountRepository,
        sessions: CustomerSessionStore,
        identity: IdentityProvider,
        tokens: SessionTokenService,
        clock: Clock,
      ) => new SignInWithGoogleUseCase({ accounts, sessions, identity, tokens, clock }),
      inject: [
        CUSTOMER_ACCOUNT_REPOSITORY,
        CUSTOMER_SESSION_STORE,
        IDENTITY_PROVIDER,
        ACCOUNT_TOKENS,
        ACCOUNT_CLOCK,
      ],
    },
    {
      provide: GetCurrentAccountUseCase,
      useFactory: (
        accounts: CustomerAccountRepository,
        sessions: CustomerSessionStore,
        tokens: SessionTokenService,
        clock: Clock,
      ) => new GetCurrentAccountUseCase(accounts, sessions, tokens, clock),
      inject: [CUSTOMER_ACCOUNT_REPOSITORY, CUSTOMER_SESSION_STORE, ACCOUNT_TOKENS, ACCOUNT_CLOCK],
    },
    {
      provide: SignOutAccountUseCase,
      useFactory: (sessions: CustomerSessionStore, tokens: SessionTokenService) =>
        new SignOutAccountUseCase(sessions, tokens),
      inject: [CUSTOMER_SESSION_STORE, ACCOUNT_TOKENS],
    },
    {
      provide: ListMyOrdersUseCase,
      useFactory: (orders: OrderRepository) => new ListMyOrdersUseCase(orders),
      inject: [ACCOUNT_ORDER_REPOSITORY],
    },
    skyUseCase(GetSkyDataUseCase),
    skyUseCase(DeleteSkyDataUseCase),
    skyUseCase(DeleteSkyBondUseCase),
    skyClockUseCase(SaveSkyProfileUseCase),
    skyClockUseCase(AddSkyQuestionUseCase),
    skyClockUseCase(AddSkyBondUseCase),
    AccountOriginGuard,
    AccountSessionGuard,
    AuthRateLimitGuard,
  ],
})
export class AccountModule {}
