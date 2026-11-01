import { CUSTOMER_SIGNED_IN_COOKIE } from '@antrina/contracts';
import { type CookieOptions, type Request, type Response } from 'express';

const SESSION_COOKIE = 'antrina_session';
const OAUTH_COOKIE = 'antrina_oauth';
const OAUTH_COOKIE_PATH = '/auth';
const OAUTH_MAX_AGE_MS = 10 * 60 * 1000;

const DEFAULT_NEXT = '/cuenta';
const MAX_NEXT_LENGTH = 200;

/** Lo que recordamos mientras el cliente está en Google. */
export interface OAuthCookie {
  state: string;
  nonce: string;
  codeVerifier: string;
  next: string;
}

/** Lax y no Strict: la vuelta de Google es una navegación desde otro sitio y debe llevar la cookie. */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function readCustomerSessionToken(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE);
}

export function setCustomerSessionCookies(
  response: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  response.cookie(SESSION_COOKIE, token, { ...baseOptions(secure), expires: expiresAt });
  response.cookie(CUSTOMER_SIGNED_IN_COOKIE, '1', {
    ...baseOptions(secure),
    httpOnly: false,
    expires: expiresAt,
  });
}

export function clearCustomerSessionCookies(response: Response, secure: boolean): void {
  response.clearCookie(SESSION_COOKIE, baseOptions(secure));
  response.clearCookie(CUSTOMER_SIGNED_IN_COOKIE, { ...baseOptions(secure), httpOnly: false });
}

export function setOAuthCookie(response: Response, value: OAuthCookie, secure: boolean): void {
  response.cookie(OAUTH_COOKIE, JSON.stringify(value), {
    ...baseOptions(secure),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_MAX_AGE_MS,
  });
}

export function clearOAuthCookie(response: Response, secure: boolean): void {
  response.clearCookie(OAUTH_COOKIE, { ...baseOptions(secure), path: OAUTH_COOKIE_PATH });
}

export function readOAuthCookie(request: Request): OAuthCookie | null {
  const raw = readCookie(request, OAUTH_COOKIE);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<OAuthCookie>;
    return typeof value.state === 'string' &&
      typeof value.nonce === 'string' &&
      typeof value.codeVerifier === 'string' &&
      typeof value.next === 'string'
      ? (value as OAuthCookie)
      : null;
  } catch {
    return null;
  }
}

/** Solo rutas internas de la tienda: evita usar el acceso para redirigir a otro sitio. */
export function safeNextPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > MAX_NEXT_LENGTH ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return DEFAULT_NEXT;
  }
  return value;
}

export function withAuthError(next: string, error: string): string {
  const url = new URL(next, 'http://tienda.invalid');
  url.searchParams.set('error', error);
  return `${url.pathname}${url.search}`;
}
