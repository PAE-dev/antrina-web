import { Module } from '@nestjs/common';
import {
  type AdminAuthDeps,
  ConfirmTotpEnrollmentUseCase,
  GetCurrentAdminUseCase,
  LoginUseCase,
  LogoutUseCase,
  StartTotpEnrollmentUseCase,
  VerifyTotpUseCase,
} from '@antrina/application';
import {
  type AdminSessionStore,
  type AdminUserRepository,
  type AuditLog,
  type Clock,
  type PasswordHasher,
  type SecretCipher,
  type SessionTokenService,
  type TotpService,
} from '@antrina/domain';
import { APP_ENV, type AppEnv } from '../config/env.js';
import {
  ADMIN_AUTH_DEPS,
  ADMIN_SESSION_STORE,
  ADMIN_USER_REPOSITORY,
  AUDIT_LOG,
  CLOCK,
  PASSWORD_HASHER,
  SECRET_CIPHER,
  SESSION_TOKEN_SERVICE,
  TOTP_SERVICE,
} from './admin-auth.tokens.js';
import { AesGcmSecretCipher } from './infrastructure/aes-gcm-secret.cipher.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password.hasher.js';
import {
  CryptoSessionTokenService,
  SystemClock,
} from './infrastructure/crypto-session-token.service.js';
import { OtplibTotpService } from './infrastructure/otplib-totp.service.js';
import {
  PrismaAdminSessionStore,
  PrismaAdminUserRepository,
  PrismaAuditLog,
} from './infrastructure/prisma-admin.repositories.js';
import { AdminAuthController } from './presentation/admin-auth.controller.js';
import {
  AdminOriginGuard,
  AdminSessionGuard,
  AuthRateLimitGuard,
} from './presentation/admin.guards.js';

const authUseCase = <T>(UseCase: new (deps: AdminAuthDeps) => T) => ({
  provide: UseCase,
  useFactory: (deps: AdminAuthDeps) => new UseCase(deps),
  inject: [ADMIN_AUTH_DEPS],
});

@Module({
  controllers: [AdminAuthController],
  providers: [
    { provide: ADMIN_USER_REPOSITORY, useClass: PrismaAdminUserRepository },
    { provide: ADMIN_SESSION_STORE, useClass: PrismaAdminSessionStore },
    { provide: AUDIT_LOG, useClass: PrismaAuditLog },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOTP_SERVICE, useClass: OtplibTotpService },
    { provide: SESSION_TOKEN_SERVICE, useClass: CryptoSessionTokenService },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: SECRET_CIPHER,
      useFactory: (env: AppEnv) => new AesGcmSecretCipher(env.adminEncryptionKey),
      inject: [APP_ENV],
    },
    {
      provide: ADMIN_AUTH_DEPS,
      useFactory: (
        users: AdminUserRepository,
        sessions: AdminSessionStore,
        hasher: PasswordHasher,
        totp: TotpService,
        cipher: SecretCipher,
        tokens: SessionTokenService,
        audit: AuditLog,
        clock: Clock,
      ): AdminAuthDeps => ({ users, sessions, hasher, totp, cipher, tokens, audit, clock }),
      inject: [
        ADMIN_USER_REPOSITORY,
        ADMIN_SESSION_STORE,
        PASSWORD_HASHER,
        TOTP_SERVICE,
        SECRET_CIPHER,
        SESSION_TOKEN_SERVICE,
        AUDIT_LOG,
        CLOCK,
      ],
    },
    authUseCase(LoginUseCase),
    authUseCase(VerifyTotpUseCase),
    authUseCase(StartTotpEnrollmentUseCase),
    authUseCase(ConfirmTotpEnrollmentUseCase),
    {
      provide: LogoutUseCase,
      useFactory: (sessions: AdminSessionStore, tokens: SessionTokenService) =>
        new LogoutUseCase(sessions, tokens),
      inject: [ADMIN_SESSION_STORE, SESSION_TOKEN_SERVICE],
    },
    {
      provide: GetCurrentAdminUseCase,
      useFactory: (
        users: AdminUserRepository,
        sessions: AdminSessionStore,
        tokens: SessionTokenService,
        clock: Clock,
      ) => new GetCurrentAdminUseCase(users, sessions, tokens, clock),
      inject: [ADMIN_USER_REPOSITORY, ADMIN_SESSION_STORE, SESSION_TOKEN_SERVICE, CLOCK],
    },
    AdminOriginGuard,
    AdminSessionGuard,
    AuthRateLimitGuard,
  ],
  exports: [GetCurrentAdminUseCase, AdminOriginGuard, AdminSessionGuard, AUDIT_LOG],
})
export class AdminAuthModule {}
