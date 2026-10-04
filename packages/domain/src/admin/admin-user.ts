export const ADMIN_ROLES = ['OWNER', 'EDITOR'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Política de acceso al panel. */
export const ADMIN_SECURITY = {
  maxFailedLogins: 5,
  lockoutMs: 15 * 60 * 1000,
  /** Sesión a medio camino (contraseña correcta, falta el código 2FA). */
  pendingSessionTtlMs: 10 * 60 * 1000,
  sessionTtlMs: 8 * 60 * 60 * 1000,
  idleTimeoutMs: 30 * 60 * 1000,
  minPasswordLength: 12,
} as const;

export interface AdminUserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  totpSecretEnc: string | null;
  totpEnabledAt: Date | null;
  failedLogins: number;
  lockedUntil: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export class AdminUser {
  private constructor(private readonly props: AdminUserProps) {}

  static create(props: AdminUserProps): AdminUser {
    return new AdminUser({ ...props, email: normalizeEmail(props.email) });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): AdminRole {
    return this.props.role;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get totpSecretEnc(): string | null {
    return this.props.totpSecretEnc;
  }

  get hasTotpEnabled(): boolean {
    return this.props.totpEnabledAt !== null && this.props.totpSecretEnc !== null;
  }

  get failedLogins(): number {
    return this.props.failedLogins;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  toProps(): AdminUserProps {
    return { ...this.props };
  }

  isLocked(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  /** Cada fallo (contraseña o código 2FA) suma; al llegar al máximo se bloquea la cuenta. */
  withFailedAttempt(now: Date): AdminUser {
    const failedLogins = this.props.failedLogins + 1;
    const shouldLock = failedLogins >= ADMIN_SECURITY.maxFailedLogins;
    return new AdminUser({
      ...this.props,
      failedLogins: shouldLock ? 0 : failedLogins,
      lockedUntil: shouldLock
        ? new Date(now.getTime() + ADMIN_SECURITY.lockoutMs)
        : this.props.lockedUntil,
    });
  }

  withSuccessfulLogin(now: Date): AdminUser {
    return new AdminUser({ ...this.props, failedLogins: 0, lockedUntil: null, lastLoginAt: now });
  }

  withPendingTotpSecret(secretEnc: string): AdminUser {
    return new AdminUser({ ...this.props, totpSecretEnc: secretEnc, totpEnabledAt: null });
  }

  withTotpEnabled(now: Date): AdminUser {
    return new AdminUser({ ...this.props, totpEnabledAt: now });
  }

  can(permission: AdminPermission): boolean {
    return ROLE_PERMISSIONS[this.props.role].includes(permission);
  }
}

export type AdminPermission = 'catalog.manage' | 'admins.manage';

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  OWNER: ['catalog.manage', 'admins.manage'],
  EDITOR: ['catalog.manage'],
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
