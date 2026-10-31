import { Module } from '@nestjs/common';
import {
  type AdminAuthDeps,
  ChangeOwnPasswordUseCase,
  CreateAdminUserUseCase,
  CreateManagedAdminUserUseCase,
  GetAdminUserUseCase,
  ListAdminUsersUseCase,
  ResetAdminPasswordUseCase,
  UpdateAdminUserUseCase,
} from '@antrina/application';
import {
  type AdminSessionStore,
  type AdminUserRepository,
  type AuditLog,
  type PasswordHasher,
} from '@antrina/domain';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import {
  ADMIN_AUTH_DEPS,
  ADMIN_SESSION_STORE,
  ADMIN_USER_REPOSITORY,
  AUDIT_LOG,
  PASSWORD_HASHER,
} from '../admin-auth/admin-auth.tokens.js';
import {
  AdminAccountController,
  AdminUsersController,
} from './presentation/admin-users.controller.js';

/** Usuarios del panel, sus roles y contraseñas. */
@Module({
  imports: [AdminAuthModule],
  controllers: [AdminUsersController, AdminAccountController],
  providers: [
    {
      provide: ListAdminUsersUseCase,
      useFactory: (users: AdminUserRepository) => new ListAdminUsersUseCase(users),
      inject: [ADMIN_USER_REPOSITORY],
    },
    {
      provide: GetAdminUserUseCase,
      useFactory: (users: AdminUserRepository) => new GetAdminUserUseCase(users),
      inject: [ADMIN_USER_REPOSITORY],
    },
    {
      provide: CreateManagedAdminUserUseCase,
      useFactory: (users: AdminUserRepository, hasher: PasswordHasher, audit: AuditLog) =>
        new CreateManagedAdminUserUseCase(new CreateAdminUserUseCase(users, hasher), audit),
      inject: [ADMIN_USER_REPOSITORY, PASSWORD_HASHER, AUDIT_LOG],
    },
    {
      provide: UpdateAdminUserUseCase,
      useFactory: (users: AdminUserRepository, sessions: AdminSessionStore, audit: AuditLog) =>
        new UpdateAdminUserUseCase(users, sessions, audit),
      inject: [ADMIN_USER_REPOSITORY, ADMIN_SESSION_STORE, AUDIT_LOG],
    },
    {
      provide: ResetAdminPasswordUseCase,
      useFactory: (
        users: AdminUserRepository,
        sessions: AdminSessionStore,
        hasher: PasswordHasher,
        audit: AuditLog,
      ) => new ResetAdminPasswordUseCase(users, sessions, hasher, audit),
      inject: [ADMIN_USER_REPOSITORY, ADMIN_SESSION_STORE, PASSWORD_HASHER, AUDIT_LOG],
    },
    {
      provide: ChangeOwnPasswordUseCase,
      useFactory: (deps: AdminAuthDeps) => new ChangeOwnPasswordUseCase(deps),
      inject: [ADMIN_AUTH_DEPS],
    },
  ],
})
export class AdminUsersModule {}
