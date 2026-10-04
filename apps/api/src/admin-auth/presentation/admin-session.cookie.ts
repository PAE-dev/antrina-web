import { type AdminPrincipal } from '@antrina/application';
import { type Request, type Response } from 'express';

export const ADMIN_SESSION_COOKIE = 'antrina_admin';
const COOKIE_PATH = '/admin';

export interface AdminRequest extends Request {
  admin?: AdminPrincipal;
}

export function readSessionToken(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[ADMIN_SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  response.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: Response, secure: boolean): void {
  response.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: COOKIE_PATH,
  });
}

export function requestContext(request: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip: request.ip ?? null,
    userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
  };
}
