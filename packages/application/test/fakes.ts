import {
  type AdminSession,
  type AdminSessionStore,
  AdminUser,
  type AdminUserRepository,
  type AuditEntry,
  type AuditLog,
  type Clock,
  type NewAdminSession,
  type NewAdminUser,
  type PasswordHasher,
  type SecretCipher,
  type SessionTokenService,
  type TotpService,
} from '@antrina/domain';
import { type AdminAuthDeps } from '../src/index.js';

export class FakeClock implements Clock {
  constructor(public current = new Date('2026-10-04T12:00:00Z')) {}
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class InMemoryAdminUsers implements AdminUserRepository {
  readonly users = new Map<string, AdminUser>();
  private seq = 0;

  async findByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }
  async findById(id: string) {
    return this.users.get(id) ?? null;
  }
  async create(input: NewAdminUser) {
    const user = AdminUser.create({
      id: `admin-${++this.seq}`,
      ...input,
      totpSecretEnc: null,
      totpEnabledAt: null,
      failedLogins: 0,
      lockedUntil: null,
      isActive: true,
      lastLoginAt: null,
    });
    this.users.set(user.id, user);
    return user;
  }
  async save(user: AdminUser) {
    this.users.set(user.id, user);
  }
}

interface StoredSession extends AdminSession {
  tokenHash: string;
}

export class InMemorySessions implements AdminSessionStore {
  readonly sessions = new Map<string, StoredSession>();
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  async create(input: NewAdminSession) {
    const session: StoredSession = {
      id: `session-${++this.seq}`,
      adminUserId: input.adminUserId,
      tokenHash: input.tokenHash,
      mfaVerified: input.mfaVerified,
      expiresAt: input.expiresAt,
      lastSeenAt: this.clock.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }
  async findByTokenHash(tokenHash: string) {
    return [...this.sessions.values()].find((session) => session.tokenHash === tokenHash) ?? null;
  }
  async markMfaVerified(id: string, expiresAt: Date, now: Date) {
    const session = this.sessions.get(id);
    if (session)
      this.sessions.set(id, { ...session, mfaVerified: true, expiresAt, lastSeenAt: now });
  }
  async touch(id: string, now: Date) {
    const session = this.sessions.get(id);
    if (session) this.sessions.set(id, { ...session, lastSeenAt: now });
  }
  async delete(id: string) {
    this.sessions.delete(id);
  }
}

export const fakeHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  verify: async (hash, password) => hash === `hashed:${password}`,
};

/** El código válido es siempre "123456" para la semilla que se genere. */
export const fakeTotp: TotpService = {
  generateSecret: () => 'SECRET',
  buildEnrollment: async (secret, account) => ({
    otpauthUri: `otpauth://totp/Antrina:${account}?secret=${secret}`,
    qrDataUrl: 'data:image/png;base64,QR',
  }),
  verify: async (code, secret) => secret === 'SECRET' && code === '123456',
};

export const fakeCipher: SecretCipher = {
  encrypt: (plain) => `enc:${plain}`,
  decrypt: (encrypted) => encrypted.replace(/^enc:/, ''),
};

export function fakeTokens(): SessionTokenService {
  let seq = 0;
  return {
    generate: () => {
      const token = `token-${++seq}`;
      return { token, tokenHash: `hash:${token}` };
    },
    hash: (token) => `hash:${token}`,
  };
}

export class MemoryAudit implements AuditLog {
  readonly entries: AuditEntry[] = [];
  async record(entry: AuditEntry) {
    this.entries.push(entry);
  }
}

export function createAuthDeps() {
  const clock = new FakeClock();
  const users = new InMemoryAdminUsers();
  const sessions = new InMemorySessions(clock);
  const audit = new MemoryAudit();
  const deps: AdminAuthDeps = {
    users,
    sessions,
    hasher: fakeHasher,
    totp: fakeTotp,
    cipher: fakeCipher,
    tokens: fakeTokens(),
    audit,
    clock,
  };
  return { deps, clock, users, sessions, audit };
}
