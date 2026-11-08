import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { type AccountPrincipal, GetCurrentAccountUseCase } from '@antrina/application';
import { DomainError } from '@antrina/domain';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import {
  type AccountRequest,
  readAccountToken,
  setAccountCookie,
} from './account-session.cookie.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** CSRF: las mutaciones de la cuenta solo se aceptan desde la tienda (además de SameSite=Lax). */
@Injectable()
export class AccountOriginGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    if (SAFE_METHODS.has(request.method)) return true;
    const origin = request.get('origin');
    const allowed = new Set([...this.env.corsOrigins, new URL(this.env.account.siteUrl).origin]);
    if (!origin || !allowed.has(origin)) {
      throw new DomainError('Origen no permitido', 'auth.forbidden');
    }
    return true;
  }
}

/** Exige sesión de cliente (401 `auth.required` si no hay) y la deja en `request.account`. */
@Injectable()
export class AccountSessionGuard implements CanActivate {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(GetCurrentAccountUseCase) private readonly current: GetCurrentAccountUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AccountRequest>();
    const token = readAccountToken(request);
    const principal = await this.current.execute({ sessionToken: token });
    if (!principal) throw new DomainError('Inicia sesión para continuar', 'auth.required');
    if (principal.renewedUntil && token) {
      setAccountCookie(http.getResponse(), this.env, token, principal.renewedUntil);
    }
    request.account = { account: principal.account, sessionId: principal.sessionId };
    return true;
  }
}

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccountPrincipal => {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    if (!request.account) throw new DomainError('Inicia sesión para continuar', 'auth.required');
    return request.account;
  },
);
