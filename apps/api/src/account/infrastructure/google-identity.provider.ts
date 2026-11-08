import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, type IdentityProvider, type VerifiedIdentity } from '@antrina/domain';
import { APP_ENV, type AppEnv } from '../../config/env.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const TIMEOUT_MS = 8000;

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}

const failed = () =>
  new DomainError('No pudimos verificar tu cuenta de Google', 'auth.google_failed');

/**
 * OAuth 2.0 / OpenID Connect con Google (código de autorización + PKCE). El `id_token` llega
 * directamente del endpoint de tokens por TLS, así que basta validar emisor, audiencia y caducidad
 * (OpenID Connect Core 3.1.3.7).
 */
@Injectable()
export class GoogleIdentityProvider implements IdentityProvider {
  private readonly logger = new Logger(GoogleIdentityProvider.name);

  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  isConfigured(): boolean {
    return Boolean(this.env.account.googleClientId && this.env.account.googleClientSecret);
  }

  authorizationUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.env.account.googleClientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<VerifiedIdentity> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: input.code,
        client_id: this.env.account.googleClientId,
        client_secret: this.env.account.googleClientSecret,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => null);
    if (!response?.ok) {
      this.logger.warn(`Google rechazó el código (${response?.status ?? 'sin respuesta'})`);
      throw failed();
    }
    const body = (await response.json()) as { id_token?: string };
    const claims = this.decode(body.id_token);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      !claims ||
      !ISSUERS.has(claims.iss ?? '') ||
      claims.aud !== this.env.account.googleClientId ||
      !claims.exp ||
      claims.exp < nowSeconds ||
      !claims.sub ||
      !claims.email
    ) {
      throw failed();
    }
    return {
      sub: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: claims.name ?? '',
      picture: claims.picture?.startsWith('https://') ? claims.picture : null,
    };
  }

  private decode(idToken: string | undefined): IdTokenClaims | null {
    const payload = idToken?.split('.')[1];
    if (!payload) return null;
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as IdTokenClaims;
    } catch {
      return null;
    }
  }
}
