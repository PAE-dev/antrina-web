import { type AccountPrincipal } from '@antrina/application';
import { type CookieOptions, type Request, type Response } from 'express';
import { type AppEnv } from '../../config/env.js';

/** Cookie de sesión del cliente: una sola para todo el sitio (bosque, mundos y Tu cielo). */
export const ACCOUNT_SESSION_COOKIE = 'antrina_session';
/** Estado de OAuth (state + PKCE + ruta de vuelta) mientras la persona está en Google. */
export const OAUTH_STATE_COOKIE = 'antrina_oauth';
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface AccountRequest extends Request {
  account?: AccountPrincipal;
}

function baseOptions(env: AppEnv, path: string): CookieOptions {
  return {
    httpOnly: true,
    // Lax: la cookie viaja al volver de Google (navegación de primer nivel) y en las peticiones
    // de la tienda a la API (mismo sitio), pero no en formularios de otros sitios.
    sameSite: 'lax',
    secure: env.isProduction,
    path,
    ...(env.account.cookieDomain ? { domain: env.account.cookieDomain } : {}),
  };
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const readAccountToken = (request: Request) => readCookie(request, ACCOUNT_SESSION_COOKIE);
export const readOAuthState = (request: Request) => readCookie(request, OAUTH_STATE_COOKIE);

export function setAccountCookie(
  response: Response,
  env: AppEnv,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(ACCOUNT_SESSION_COOKIE, token, { ...baseOptions(env, '/'), expires: expiresAt });
}

export function clearAccountCookie(response: Response, env: AppEnv): void {
  response.clearCookie(ACCOUNT_SESSION_COOKIE, baseOptions(env, '/'));
}

export function setOAuthState(response: Response, env: AppEnv, value: string): void {
  response.cookie(OAUTH_STATE_COOKIE, value, {
    ...baseOptions(env, '/auth'),
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

export function clearOAuthState(response: Response, env: AppEnv): void {
  response.clearCookie(OAUTH_STATE_COOKIE, baseOptions(env, '/auth'));
}

/** Solo rutas internas de la tienda ("/tu-cielo"): nunca otro dominio ("//x", "/\\x", "https:"). */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 300) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  if ([...value].some((char) => char.charCodeAt(0) < 0x20)) return '/';
  return value;
}
