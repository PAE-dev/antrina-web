import { createHash, randomBytes } from 'node:crypto';
import {
  DomainError,
  type GoogleAuthorization,
  type GoogleIdentity,
  type GoogleIdentityProvider,
} from '@antrina/domain';

const AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const TIMEOUT_MS = 8000;

export interface GoogleOidcConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

function failed(): DomainError {
  return new DomainError('No se pudo validar el acceso con Google', 'auth.google_failed');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** OpenID Connect de Google con código de autorización y PKCE. */
export class GoogleOidcProvider implements GoogleIdentityProvider {
  constructor(private readonly config: GoogleOidcConfig | null) {}

  isEnabled(): boolean {
    return this.config !== null;
  }

  createAuthorization(): GoogleAuthorization {
    const config = this.requireConfig();
    const state = randomToken();
    const nonce = randomToken();
    const codeVerifier = randomToken();
    const url = new URL(AUTHORIZATION_URL);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return { url: url.toString(), state, nonce, codeVerifier };
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<GoogleIdentity> {
    const config = this.requireConfig();
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        code_verifier: input.codeVerifier,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {
      throw failed();
    });
    if (!response.ok) throw failed();
    const body = (await response.json()) as { id_token?: string };
    return this.identityFrom(body.id_token, config.clientId, input.nonce);
  }

  /**
   * El token llega directo de Google por TLS, así que OpenID Connect permite validar sus datos sin
   * comprobar la firma (Core 1.0, §3.1.3.7).
   */
  private identityFrom(
    idToken: string | undefined,
    clientId: string,
    nonce: string,
  ): GoogleIdentity {
    const claims = decodeClaims(idToken);
    const isValid =
      ISSUERS.includes(claims.iss ?? '') &&
      claims.aud === clientId &&
      claims.nonce === nonce &&
      typeof claims.exp === 'number' &&
      claims.exp * 1000 > Date.now() &&
      Boolean(claims.sub) &&
      Boolean(claims.email);
    if (!isValid) throw failed();
    return {
      subject: claims.sub!,
      email: claims.email!,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: claims.name?.trim().slice(0, 120) || claims.email!.split('@')[0]!,
    };
  }

  private requireConfig(): GoogleOidcConfig {
    if (!this.config) {
      throw new DomainError('El acceso con Google no está disponible', 'auth.google_unavailable');
    }
    return this.config;
  }
}

function decodeClaims(idToken: string | undefined): IdTokenClaims {
  const payload = idToken?.split('.')[1];
  if (!payload) throw failed();
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as IdTokenClaims;
  } catch {
    throw failed();
  }
}
