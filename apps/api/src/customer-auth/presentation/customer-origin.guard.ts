import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@antrina/domain';
import { type Request } from 'express';
import { APP_ENV, type AppEnv } from '../../config/env.js';

/** Las mutaciones de la cuenta solo se aceptan desde la tienda. */
@Injectable()
export class CustomerOriginGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.get('origin') !== this.env.storeOrigin) {
      throw new DomainError('Origen no permitido', 'auth.forbidden');
    }
    return true;
  }
}
