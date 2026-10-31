import {
  type AdminUserDto,
  type AdminUserListResponse,
  type ChangeOwnPasswordRequest,
  type CreateAdminUserRequest,
  type ResetAdminPasswordRequest,
  type UpdateAdminUserRequest,
} from '@antrina/contracts';
import {
  ADMIN_ROLES,
  type AdminSessionStore,
  type AdminUser,
  type AdminUserRepository,
  type AuditLog,
  DomainError,
  type PasswordHasher,
} from '@antrina/domain';
import { notFound, requireBoolean, requireOneOf, requireString } from '../shared/input.js';
import { type AdminAuthDeps, registerFailedAttempt, unauthorized } from './admin-auth.deps.js';
import {
  assertValidPassword,
  type CreateAdminUserUseCase,
  parseAdminEmail,
  parseAdminName,
} from './create-admin-user.use-case.js';

const adminNotFound = () => notFound('Administrador', 'admin.not_found');

export function toAdminUserDto(user: AdminUser): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    hasTotp: user.hasTotpEnabled,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export class ListAdminUsersUseCase {
  constructor(private readonly users: AdminUserRepository) {}

  async execute(): Promise<AdminUserListResponse> {
    return { data: (await this.users.list()).map(toAdminUserDto) };
  }
}

export class GetAdminUserUseCase {
  constructor(private readonly users: AdminUserRepository) {}

  async execute(id: string): Promise<AdminUserDto> {
    const user = await this.users.findById(id);
    if (!user) throw adminNotFound();
    return toAdminUserDto(user);
  }
}

export class CreateManagedAdminUserUseCase {
  constructor(
    private readonly create: CreateAdminUserUseCase,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: CreateAdminUserRequest, actorId: string): Promise<AdminUserDto> {
    const user = await this.create.execute({
      email: requireString(input?.email, 'email', 160),
      name: requireString(input?.name, 'name', 80),
      password: requireString(input?.password, 'password'),
      role: requireOneOf(input?.role, ADMIN_ROLES, 'role'),
    });
    await this.audit.record({
      adminUserId: actorId,
      action: 'admin_user.created',
      entityType: 'AdminUser',
      entityId: user.id,
      changes: { email: user.email, role: user.role },
    });
    return toAdminUserDto(user);
  }
}

export class UpdateAdminUserUseCase {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly sessions: AdminSessionStore,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, input: UpdateAdminUserRequest, actorId: string): Promise<AdminUserDto> {
    const current = await this.users.findById(id);
    if (!current) throw adminNotFound();

    const email = parseAdminEmail(requireString(input?.email, 'email', 160));
    const name = parseAdminName(requireString(input?.name, 'name', 80));
    const role = requireOneOf(input?.role, ADMIN_ROLES, 'role');
    const isActive = requireBoolean(input?.isActive, 'isActive');

    if (id === actorId && !isActive) {
      throw new DomainError('No puedes desactivar tu propia cuenta', 'admin.self_deactivation');
    }
    const losesOwner =
      current.isActive && current.role === 'OWNER' && (!isActive || role !== 'OWNER');
    if (losesOwner) await this.assertAnotherActiveOwner(id);
    if (email !== current.email && (await this.users.findByEmail(email))) {
      throw new DomainError('Ya existe un administrador con ese correo', 'admin.duplicate_email');
    }

    const updated = current.withProfile({ email, name, role }).withActive(isActive);
    await this.users.save(updated);
    if (!isActive) await this.sessions.deleteAllForUser(id);

    const previous = toAdminUserDto(current);
    const next = toAdminUserDto(updated);
    const fields = ['email', 'name', 'role', 'isActive'] as const;
    await this.audit.record({
      adminUserId: actorId,
      action: 'admin_user.updated',
      entityType: 'AdminUser',
      entityId: id,
      changes: Object.fromEntries(
        fields
          .filter((field) => previous[field] !== next[field])
          .map((field) => [field, { from: previous[field], to: next[field] }]),
      ),
    });
    return next;
  }

  private async assertAnotherActiveOwner(id: string): Promise<void> {
    const others = (await this.users.list()).filter(
      (user) => user.id !== id && user.isActive && user.role === 'OWNER',
    );
    if (others.length === 0) {
      throw new DomainError('Debe quedar al menos un propietario activo', 'admin.last_owner');
    }
  }
}

/** Un propietario le asigna una contraseña nueva a otra persona: se cierran sus sesiones. */
export class ResetAdminPasswordUseCase {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly sessions: AdminSessionStore,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditLog,
  ) {}

  async execute(
    id: string,
    input: ResetAdminPasswordRequest,
    actorId: string,
  ): Promise<AdminUserDto> {
    if (id === actorId) {
      throw new DomainError('Cambia tu contraseña desde Mi cuenta', 'admin.use_own_password');
    }
    const user = await this.users.findById(id);
    if (!user) throw adminNotFound();
    const password = requireString(input?.password, 'password');
    assertValidPassword(password);

    const updated = user.withPasswordHash(await this.hasher.hash(password));
    await this.users.save(updated);
    await this.sessions.deleteAllForUser(id);
    await this.audit.record({
      adminUserId: actorId,
      action: 'admin_user.password_reset',
      entityType: 'AdminUser',
      entityId: id,
    });
    return toAdminUserDto(updated);
  }
}

/** Cada quien cambia la suya confirmando la actual; sus otras sesiones se cierran. */
export class ChangeOwnPasswordUseCase {
  constructor(private readonly deps: AdminAuthDeps) {}

  async execute(
    input: ChangeOwnPasswordRequest,
    actor: { id: string; sessionId: string },
  ): Promise<void> {
    const { users, sessions, hasher, audit, clock } = this.deps;
    const user = await users.findById(actor.id);
    if (!user) throw unauthorized();
    const currentPassword = requireString(input?.currentPassword, 'currentPassword');
    const newPassword = requireString(input?.newPassword, 'newPassword');
    assertValidPassword(newPassword);

    if (!(await hasher.verify(user.passwordHash, currentPassword))) {
      const locked = await registerFailedAttempt(this.deps, user, null, clock.now());
      throw (
        locked ?? new DomainError('La contraseña actual no es correcta', 'admin.wrong_password')
      );
    }

    await users.save(user.withPasswordHash(await hasher.hash(newPassword)));
    await sessions.deleteAllForUser(actor.id, actor.sessionId);
    await audit.record({
      adminUserId: actor.id,
      action: 'admin_user.password_changed',
      entityType: 'AdminUser',
      entityId: actor.id,
    });
  }
}
