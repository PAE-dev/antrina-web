import {
  ADMIN_SECURITY,
  type AdminSession,
  type AdminSessionStore,
  type AdminUser,
  type AdminUserRepository,
  type AuditLog,
  type Clock,
  DomainError,
  isSessionActive,
  type PasswordHasher,
  type SecretCipher,
  type SessionTokenService,
  type TotpService,
} from '@antrina/domain';

export interface AdminAuthDeps {
  users: AdminUserRepository;
  sessions: AdminSessionStore;
  hasher: PasswordHasher;
  totp: TotpService;
  cipher: SecretCipher;
  tokens: SessionTokenService;
  audit: AuditLog;
  clock: Clock;
}

export interface IssuedSession {
  /** Token opaco para la cookie; nunca se persiste en claro. */
  sessionToken: string;
  expiresAt: Date;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export const unauthorized = (): DomainError =>
  new DomainError('Sesión inválida o expirada', 'auth.unauthorized');

export function lockedError(user: AdminUser, now: Date): DomainError {
  const minutes = Math.max(
    1,
    Math.ceil(((user.lockedUntil?.getTime() ?? 0) - now.getTime()) / 60000),
  );
  return new DomainError(
    `Cuenta bloqueada temporalmente por intentos fallidos. Intenta en ${minutes} min.`,
    'auth.locked',
  );
}

/** Sesión a medio camino: contraseña verificada, falta el segundo factor. */
export async function resolvePendingSession(
  deps: AdminAuthDeps,
  token: string | null | undefined,
  now: Date,
): Promise<{ session: AdminSession; user: AdminUser }> {
  if (!token) throw unauthorized();
  const session = await deps.sessions.findByTokenHash(deps.tokens.hash(token));
  if (!session || session.mfaVerified || !isSessionActive(session, now)) throw unauthorized();
  const user = await deps.users.findById(session.adminUserId);
  if (!user || !user.isActive) throw unauthorized();
  if (user.isLocked(now)) {
    await deps.sessions.delete(session.id);
    throw lockedError(user, now);
  }
  return { session, user };
}

/** Registra un fallo de segundo factor; si bloquea la cuenta, cierra la sesión pendiente. */
export async function registerFailedAttempt(
  deps: AdminAuthDeps,
  user: AdminUser,
  session: AdminSession | null,
  now: Date,
): Promise<DomainError | null> {
  const updated = user.withFailedAttempt(now);
  await deps.users.save(updated);
  if (!updated.isLocked(now)) return null;
  if (session) await deps.sessions.delete(session.id);
  await deps.audit.record({
    adminUserId: user.id,
    action: 'auth.locked',
    entityType: 'AdminUser',
    entityId: user.id,
  });
  return lockedError(updated, now);
}

/** Tras completar el 2FA se emite un token nuevo (rotación) y se descarta el pendiente. */
export async function elevateSession(
  deps: AdminAuthDeps,
  pending: AdminSession,
  user: AdminUser,
  context: RequestContext,
  now: Date,
): Promise<IssuedSession> {
  await deps.sessions.delete(pending.id);
  const { token, tokenHash } = deps.tokens.generate();
  const expiresAt = new Date(now.getTime() + ADMIN_SECURITY.sessionTtlMs);
  await deps.sessions.create({
    adminUserId: user.id,
    tokenHash,
    mfaVerified: true,
    expiresAt,
    ip: context.ip,
    userAgent: context.userAgent,
  });
  await deps.users.save(user.withSuccessfulLogin(now));
  await deps.audit.record({
    adminUserId: user.id,
    action: 'auth.login',
    entityType: 'AdminUser',
    entityId: user.id,
    ...(context.ip ? { changes: { ip: context.ip } } : {}),
  });
  return { sessionToken: token, expiresAt };
}

export function normalizeTotpCode(code: unknown): string {
  if (typeof code !== 'string') throw new DomainError('Código inválido', 'auth.mfa_invalid');
  const digits = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(digits))
    throw new DomainError('El código tiene 6 dígitos', 'auth.mfa_invalid');
  return digits;
}
