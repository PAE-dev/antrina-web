import { Module } from '@nestjs/common';
import {
  CompleteGoogleSignInUseCase,
  CustomerLogoutUseCase,
  type CustomerSessionDeps,
  GetCurrentCustomerUseCase,
  RemoveCustomerAvatarUseCase,
  SetCustomerAvatarUseCase,
  StartGoogleSignInUseCase,
  UpdateCustomerProfileUseCase,
} from '@antrina/application';
import { CUSTOMER_AUTH_ROUTES } from '@antrina/contracts';
import {
  type Clock,
  type CustomerAccountRepository,
  type CustomerSessionStore,
  type GoogleIdentityProvider,
  type ImageStorage,
  type SessionTokenService,
} from '@antrina/domain';
import {
  CryptoSessionTokenService,
  SystemClock,
} from '../admin-auth/infrastructure/crypto-session-token.service.js';
import { IMAGE_STORAGE } from '../catalog/catalog.tokens.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { APP_ENV, type AppEnv } from '../config/env.js';
import {
  CUSTOMER_ACCOUNT_REPOSITORY,
  CUSTOMER_CLOCK,
  CUSTOMER_SESSION_STORE,
  CUSTOMER_SESSION_TOKENS,
  GOOGLE_IDENTITY_PROVIDER,
} from './customer-auth.tokens.js';
import { GoogleOidcProvider } from './infrastructure/google-oidc.provider.js';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerSessionStore,
} from './infrastructure/prisma-customer-auth.repositories.js';
import { CustomerAuthController } from './presentation/customer-auth.controller.js';
import { CustomerOriginGuard } from './presentation/customer-origin.guard.js';

/** Cuentas de cliente de la tienda: acceso con Google y sesiones. */
const SESSION_DEPS = Symbol('CustomerSessionDeps');

@Module({
  imports: [CatalogModule],
  controllers: [CustomerAuthController],
  providers: [
    { provide: CUSTOMER_ACCOUNT_REPOSITORY, useClass: PrismaCustomerAccountRepository },
    { provide: CUSTOMER_SESSION_STORE, useClass: PrismaCustomerSessionStore },
    { provide: CUSTOMER_SESSION_TOKENS, useClass: CryptoSessionTokenService },
    { provide: CUSTOMER_CLOCK, useClass: SystemClock },
    {
      provide: GOOGLE_IDENTITY_PROVIDER,
      useFactory: (env: AppEnv) =>
        new GoogleOidcProvider(
          env.google && {
            ...env.google,
            redirectUri: `${env.storeOrigin}${CUSTOMER_AUTH_ROUTES.googleCallback}`,
          },
        ),
      inject: [APP_ENV],
    },
    {
      provide: StartGoogleSignInUseCase,
      useFactory: (google: GoogleIdentityProvider) => new StartGoogleSignInUseCase(google),
      inject: [GOOGLE_IDENTITY_PROVIDER],
    },
    {
      provide: CompleteGoogleSignInUseCase,
      useFactory: (
        google: GoogleIdentityProvider,
        customers: CustomerAccountRepository,
        sessions: CustomerSessionStore,
        tokens: SessionTokenService,
        clock: Clock,
        storage: ImageStorage,
      ) => new CompleteGoogleSignInUseCase(google, customers, sessions, tokens, clock, storage),
      inject: [
        GOOGLE_IDENTITY_PROVIDER,
        CUSTOMER_ACCOUNT_REPOSITORY,
        CUSTOMER_SESSION_STORE,
        CUSTOMER_SESSION_TOKENS,
        CUSTOMER_CLOCK,
        IMAGE_STORAGE,
      ],
    },
    {
      provide: SESSION_DEPS,
      useFactory: (
        customers: CustomerAccountRepository,
        sessions: CustomerSessionStore,
        tokens: SessionTokenService,
        clock: Clock,
      ): CustomerSessionDeps => ({ customers, sessions, tokens, clock }),
      inject: [
        CUSTOMER_ACCOUNT_REPOSITORY,
        CUSTOMER_SESSION_STORE,
        CUSTOMER_SESSION_TOKENS,
        CUSTOMER_CLOCK,
      ],
    },
    {
      provide: GetCurrentCustomerUseCase,
      useFactory: (deps: CustomerSessionDeps, storage: ImageStorage) =>
        new GetCurrentCustomerUseCase(deps, storage),
      inject: [SESSION_DEPS, IMAGE_STORAGE],
    },
    {
      provide: UpdateCustomerProfileUseCase,
      useFactory: (deps: CustomerSessionDeps, storage: ImageStorage) =>
        new UpdateCustomerProfileUseCase(deps, storage),
      inject: [SESSION_DEPS, IMAGE_STORAGE],
    },
    {
      provide: SetCustomerAvatarUseCase,
      useFactory: (deps: CustomerSessionDeps, storage: ImageStorage) =>
        new SetCustomerAvatarUseCase(deps, storage),
      inject: [SESSION_DEPS, IMAGE_STORAGE],
    },
    {
      provide: RemoveCustomerAvatarUseCase,
      useFactory: (deps: CustomerSessionDeps, storage: ImageStorage) =>
        new RemoveCustomerAvatarUseCase(deps, storage),
      inject: [SESSION_DEPS, IMAGE_STORAGE],
    },
    {
      provide: CustomerLogoutUseCase,
      useFactory: (sessions: CustomerSessionStore, tokens: SessionTokenService) =>
        new CustomerLogoutUseCase(sessions, tokens),
      inject: [CUSTOMER_SESSION_STORE, CUSTOMER_SESSION_TOKENS],
    },
    CustomerOriginGuard,
  ],
  exports: [GetCurrentCustomerUseCase, CustomerOriginGuard],
})
export class CustomerAuthModule {}
