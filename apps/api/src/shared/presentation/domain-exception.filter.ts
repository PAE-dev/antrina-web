import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import { DomainError } from '@antrina/domain';
import { type Response } from 'express';

/** Traduce el `code` de los errores de dominio a un estado HTTP. */
export function statusForCode(code: string): HttpStatus {
  if (code === 'auth.locked') return HttpStatus.LOCKED;
  if (code === 'auth.forbidden') return HttpStatus.FORBIDDEN;
  if (code.startsWith('auth.')) return HttpStatus.UNAUTHORIZED;
  if (code.endsWith('not_found')) return HttpStatus.NOT_FOUND;
  if (code.includes('.duplicate_')) return HttpStatus.CONFLICT;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = statusForCode(error.code);
    response.status(statusCode).json({ statusCode, code: error.code, message: error.message });
  }
}
