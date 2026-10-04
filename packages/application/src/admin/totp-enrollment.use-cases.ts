import { type AdminTotpSetupDto } from '@antrina/contracts';
import { DomainError } from '@antrina/domain';
import {
  type AdminAuthDeps,
  elevateSession,
  type IssuedSession,
  normalizeTotpCode,
  registerFailedAttempt,
  type RequestContext,
  resolvePendingSession,
} from './admin-auth.deps.js';

const alreadyEnabled = (): DomainError =>
  new DomainError('La verificación en dos pasos ya está configurada', 'auth.mfa_already_enabled');

/** Genera la semilla TOTP (cifrada en reposo) y el QR para escanear. */
export class StartTotpEnrollmentUseCase {
  constructor(private readonly deps: AdminAuthDeps) {}

  async execute(input: { sessionToken: string | null | undefined }): Promise<AdminTotpSetupDto> {
    const now = this.deps.clock.now();
    const { user } = await resolvePendingSession(this.deps, input.sessionToken, now);
    if (user.hasTotpEnabled) throw alreadyEnabled();

    const secret = this.deps.totp.generateSecret();
    await this.deps.users.save(user.withPendingTotpSecret(this.deps.cipher.encrypt(secret)));
    const enrollment = await this.deps.totp.buildEnrollment(secret, user.email);
    return { ...enrollment, secret };
  }
}

export interface ConfirmTotpEnrollmentInput extends RequestContext {
  sessionToken: string | null | undefined;
  code: unknown;
}

/** Activa el 2FA cuando el primer código de la app coincide; deja la sesión completa. */
export class ConfirmTotpEnrollmentUseCase {
  constructor(private readonly deps: AdminAuthDeps) {}

  async execute(input: ConfirmTotpEnrollmentInput): Promise<IssuedSession> {
    const now = this.deps.clock.now();
    const { session, user } = await resolvePendingSession(this.deps, input.sessionToken, now);
    if (user.hasTotpEnabled) throw alreadyEnabled();
    const secretEnc = user.totpSecretEnc;
    if (!secretEnc) {
      throw new DomainError('Primero genera el código QR', 'auth.mfa_setup_required');
    }

    const code = normalizeTotpCode(input.code);
    const valid = await this.deps.totp.verify(code, this.deps.cipher.decrypt(secretEnc));
    if (!valid) {
      const locked = await registerFailedAttempt(this.deps, user, session, now);
      throw locked ?? new DomainError('Código incorrecto', 'auth.mfa_invalid');
    }

    const enabled = user.withTotpEnabled(now);
    await this.deps.audit.record({
      adminUserId: user.id,
      action: 'auth.mfa_enabled',
      entityType: 'AdminUser',
      entityId: user.id,
    });
    return elevateSession(this.deps, session, enabled, input, now);
  }
}
