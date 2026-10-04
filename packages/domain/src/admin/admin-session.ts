import { ADMIN_SECURITY } from './admin-user.js';

export interface AdminSession {
  id: string;
  adminUserId: string;
  mfaVerified: boolean;
  expiresAt: Date;
  lastSeenAt: Date;
}

export function isSessionActive(session: AdminSession, now: Date): boolean {
  if (session.expiresAt <= now) return false;
  if (!session.mfaVerified) return true;
  return now.getTime() - session.lastSeenAt.getTime() < ADMIN_SECURITY.idleTimeoutMs;
}
