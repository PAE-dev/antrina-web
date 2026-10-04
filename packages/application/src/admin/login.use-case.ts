import { type AdminLoginStatus } from '@antrina/contracts';
import { ADMIN_SECURITY, DomainError, normalizeEmail } from '@antrina/domain';
import {
  type AdminAuthDeps,
  type IssuedSession,
  lockedError,
  type RequestContext,
} from './admin-auth.deps.js';

export interface LoginInput extends RequestContext {
  email: unknown;
  password: unknown;
}

export interface LoginResult extends IssuedSession {
  status: AdminLoginStatus;
}

const invalidCredentials = (): DomainError =>
  new DomainError('Correo o contraseña incorrectos', 'auth.invalid_credentials');

/**
 * Primer paso: verifica la contraseña y abre una sesión pendiente de 10 minutos.
 * El acceso al panel solo se concede tras el segundo factor.
 */
export class LoginUseCase {
  constructor(private readonly deps: AdminAuthDeps) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    if (typeof input.email !== 'string' || typeof input.password !== 'string') {
      throw invalidCredentials();
    }
    if (input.email.length > 254 || input.password.length > 256) throw invalidCredentials();

    const now = this.deps.clock.now();
    const user = await this.deps.users.findByEmail(normalizeEmail(input.email));

    if (!user || !user.isActive) {
      // Mismo coste de cómputo que un usuario real para no revelar qué correos existen.
      await this.deps.hasher.hash(input.password);
      throw invalidCredentials();
    }
    if (user.isLocked(now)) throw lockedError(user, now);

    const valid = await this.deps.hasher.verify(user.passwordHash, input.password);
    if (!valid) {
      const updated = user.withFailedAttempt(now);
      await this.deps.users.save(updated);
      if (updated.isLocked(now)) {
        await this.deps.audit.record({
          adminUserId: user.id,
          action: 'auth.locked',
          entityType: 'AdminUser',
          entityId: user.id,
        });
        throw lockedError(updated, now);
      }
      throw invalidCredentials();
    }

    const { token, tokenHash } = this.deps.tokens.generate();
    const expiresAt = new Date(now.getTime() + ADMIN_SECURITY.pendingSessionTtlMs);
    await this.deps.sessions.create({
      adminUserId: user.id,
      tokenHash,
      mfaVerified: false,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      sessionToken: token,
      expiresAt,
      status: user.hasTotpEnabled ? 'MFA_REQUIRED' : 'MFA_SETUP_REQUIRED',
    };
  }
}
