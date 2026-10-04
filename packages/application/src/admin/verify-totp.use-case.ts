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

export interface VerifyTotpInput extends RequestContext {
  sessionToken: string | null | undefined;
  code: unknown;
}

/** Segundo paso del login para administradores con la app autenticadora ya configurada. */
export class VerifyTotpUseCase {
  constructor(private readonly deps: AdminAuthDeps) {}

  async execute(input: VerifyTotpInput): Promise<IssuedSession> {
    const now = this.deps.clock.now();
    const { session, user } = await resolvePendingSession(this.deps, input.sessionToken, now);
    const secretEnc = user.totpSecretEnc;
    if (!user.hasTotpEnabled || !secretEnc) {
      throw new DomainError(
        'Primero configura la verificación en dos pasos',
        'auth.mfa_setup_required',
      );
    }

    const code = normalizeTotpCode(input.code);
    const valid = await this.deps.totp.verify(code, this.deps.cipher.decrypt(secretEnc));
    if (!valid) {
      const locked = await registerFailedAttempt(this.deps, user, session, now);
      throw locked ?? new DomainError('Código incorrecto', 'auth.mfa_invalid');
    }

    return elevateSession(this.deps, session, user, input, now);
  }
}
