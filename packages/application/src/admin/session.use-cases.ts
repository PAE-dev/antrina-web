import { type AdminMeDto } from '@antrina/contracts';
import {
  type AdminPermission,
  type AdminSessionStore,
  type AdminUserRepository,
  type Clock,
  DomainError,
  isSessionActive,
  type SessionTokenService,
} from '@antrina/domain';
import { unauthorized } from './admin-auth.deps.js';

export interface AdminPrincipal extends AdminMeDto {
  sessionId: string;
  permissions: AdminPermission[];
}

const ALL_PERMISSIONS: AdminPermission[] = ['catalog.manage', 'admins.manage'];

/** Resuelve el administrador de una cookie de sesión completa (2FA verificado) y renueva su actividad. */
export class GetCurrentAdminUseCase {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly sessions: AdminSessionStore,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<AdminPrincipal> {
    if (!input.sessionToken) throw unauthorized();
    const now = this.clock.now();
    const session = await this.sessions.findByTokenHash(this.tokens.hash(input.sessionToken));
    if (!session || !session.mfaVerified) throw unauthorized();
    if (!isSessionActive(session, now)) {
      await this.sessions.delete(session.id);
      throw unauthorized();
    }
    const user = await this.users.findById(session.adminUserId);
    if (!user || !user.isActive || user.isLocked(now)) {
      await this.sessions.delete(session.id);
      throw unauthorized();
    }
    await this.sessions.touch(session.id, now);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId: session.id,
      permissions: ALL_PERMISSIONS.filter((permission) => user.can(permission)),
    };
  }
}

export function assertPermission(principal: AdminPrincipal, permission: AdminPermission): void {
  if (!principal.permissions.includes(permission)) {
    throw new DomainError('No tienes permiso para esta acción', 'auth.forbidden');
  }
}

/** Cierra la sesión (pendiente o completa) asociada a la cookie. */
export class LogoutUseCase {
  constructor(
    private readonly sessions: AdminSessionStore,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<void> {
    if (!input.sessionToken) return;
    const session = await this.sessions.findByTokenHash(this.tokens.hash(input.sessionToken));
    if (session) await this.sessions.delete(session.id);
  }
}
