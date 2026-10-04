import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
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
