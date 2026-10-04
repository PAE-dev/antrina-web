import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  type AdminPrincipal,
  assertPermission,
  GetCurrentAdminUseCase,
} from '@antrina/application';
import { type AdminPermission, DomainError } from '@antrina/domain';
import { APP_ENV, type AppEnv } from '../../config/env.js';
import { type AdminRequest, readSessionToken } from './admin-session.cookie.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa CSRF complementaria a SameSite=Strict: toda mutación del panel
 * debe venir del origen exacto del panel.
 */
@Injectable()
export class AdminOriginGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (request.get('origin') !== this.env.adminOrigin) {
      throw new DomainError('Origen no permitido', 'auth.forbidden');
    }
    return true;
  }
}

const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;

/**
 * 10 intentos por minuto, IP y endpoint en los pasos que aceptan secretos.
 * En memoria por instancia: complementa (no sustituye) el bloqueo de cuenta tras 5 fallos.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const now = Date.now();
    const key = `${request.ip ?? 'unknown'}:${context.getClass().name}.${context.getHandler().name}`;
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= MAX_TRACKED_KEYS) this.prune(now);
      this.hits.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
      return true;
    }
    entry.count += 1;
    if (entry.count > AUTH_RATE_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'auth.rate_limited',
          message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

const REQUIRED_PERMISSION = 'admin:permission';

/** Permiso requerido por el endpoint (OWNER tiene todos, EDITOR solo catálogo). */
export const RequirePermission = (permission: AdminPermission) =>
  SetMetadata(REQUIRED_PERMISSION, permission);

/** Exige una sesión completa (contraseña + 2FA) y, si se declara, el permiso del endpoint. */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    @Inject(GetCurrentAdminUseCase) private readonly currentAdmin: GetCurrentAdminUseCase,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const principal = await this.currentAdmin.execute({ sessionToken: readSessionToken(request) });
    const permission = this.reflector.getAllAndOverride<AdminPermission | undefined>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (permission) assertPermission(principal, permission);
    request.admin = principal;
    return true;
  }
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal => {
    const admin = context.switchToHttp().getRequest<AdminRequest>().admin;
    if (!admin) throw new DomainError('Sesión inválida o expirada', 'auth.unauthorized');
    return admin;
  },
);
