import { type AdminSession } from '../admin-session.js';

export interface NewAdminSession {
  adminUserId: string;
  tokenHash: string;
  mfaVerified: boolean;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}

export interface AdminSessionStore {
  create(input: NewAdminSession): Promise<AdminSession>;
  findByTokenHash(tokenHash: string): Promise<AdminSession | null>;
  markMfaVerified(id: string, expiresAt: Date, now: Date): Promise<void>;
  touch(id: string, now: Date): Promise<void>;
  delete(id: string): Promise<void>;
}
