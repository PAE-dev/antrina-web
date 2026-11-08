import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SignInWithGoogleUseCase, SignOutAccountUseCase } from '@antrina/application';
import { ACCOUNT_ROUTES } from '@antrina/contracts';
import { DomainError, type IdentityProvider } from '@antrina/domain';
import { type Request, type Response } from 'express';
import { AuthRateLimitGuard } from '../../admin-auth/presentation/admin.guards.js';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import { IDENTITY_PROVIDER } from '../account.tokens.js';
import { AccountOriginGuard } from './account.guards.js';
import {
  clearAccountCookie,
  clearOAuthState,
  readAccountToken,
  readOAuthState,
  safeReturnPath,
  setAccountCookie,
  setOAuthState,
} from './account-session.cookie.js';

const b64url = (buffer: Buffer) => buffer.toString('base64url');

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Acceso con Google (redirecciones de navegador, no JSON): `/auth/google` → Google →
 * `/auth/google/callback` → vuelve a la página de la tienda con la sesión abierta.
 */
@Controller('auth')
export class AccountAuthController {
  private readonly logger = new Logger(AccountAuthController.name);

  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProvider,
    @Inject(SignInWithGoogleUseCase) private readonly signIn: SignInWithGoogleUseCase,
    @Inject(SignOutAccountUseCase) private readonly signOut: SignOutAccountUseCase,
  ) {}

  private get redirectUri(): string {
    return `${this.env.account.apiPublicUrl}${ACCOUNT_ROUTES.googleCallback}`;
  }

  private backToSite(response: Response, path: string, login?: 'error' | 'unavailable'): void {
    const url = new URL(path, this.env.account.siteUrl);
    if (login) url.searchParams.set('login', login);
    response.redirect(HttpStatus.FOUND, url.toString());
  }

  @Get('google')
  @UseGuards(AuthRateLimitGuard)
  start(@Query('returnTo') returnTo: unknown, @Res() response: Response): void {
    const back = safeReturnPath(returnTo);
    if (!this.identity.isConfigured()) {
      this.backToSite(response, back, 'unavailable');
      return;
    }
    const state = b64url(randomBytes(24));
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    setOAuthState(response, this.env, `${state}.${verifier}.${b64url(Buffer.from(back))}`);
    response.redirect(
      HttpStatus.FOUND,
      this.identity.authorizationUrl({
        state,
        codeChallenge: challenge,
        redirectUri: this.redirectUri,
      }),
    );
  }

  @Get('google/callback')
  @UseGuards(AuthRateLimitGuard)
  async callback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const stored = readOAuthState(request);
    clearOAuthState(response, this.env);
    const [expected, verifier, backB64] = stored?.split('.') ?? [];
    const back = safeReturnPath(backB64 ? Buffer.from(backB64, 'base64url').toString('utf8') : '/');

    if (
      error ||
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      !expected ||
      !verifier ||
      !sameSecret(state, expected)
    ) {
      this.backToSite(response, back, 'error');
      return;
    }
    try {
      const issued = await this.signIn.execute({
        code,
        codeVerifier: verifier,
        redirectUri: this.redirectUri,
        ip: request.ip ?? null,
        userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
      });
      setAccountCookie(response, this.env, issued.sessionToken, issued.expiresAt);
      this.backToSite(response, back);
    } catch (failure) {
      if (!(failure instanceof DomainError)) this.logger.error(failure);
      this.backToSite(response, back, 'error');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccountOriginGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.signOut.execute({ sessionToken: readAccountToken(request) });
    clearAccountCookie(response, this.env);
  }
}
