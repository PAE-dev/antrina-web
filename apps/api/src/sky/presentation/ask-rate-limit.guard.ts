import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { type Request } from 'express';

/** Cabecera con la IP real del visitante que añade el proxy de la tienda (`api-proxy.ts`). */
const VISITOR_IP_HEADER = 'x-antrina-visitor-ip';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const PER_VISITOR_PER_MINUTE = 5;
const PER_VISITOR_PER_DAY = 40;
/** Tope global por instancia: protege el gasto aunque alguien rote IPs. */
const GLOBAL_PER_MINUTE = 120;
const MAX_TRACKED = 20_000;

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Límite de "Pregunta al cielo" (cada respuesta es una llamada al modelo): por visitante (minuto y
 * día) y global. En memoria por instancia, como el de acceso del panel.
 */
@Injectable()
export class AskRateLimitGuard implements CanActivate {
  private readonly minute = new Map<string, Window>();
  private readonly day = new Map<string, Window>();
  private global: Window = { count: 0, resetAt: 0 };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const visitor = (request.get(VISITOR_IP_HEADER) ?? request.ip ?? 'unknown').slice(0, 64);

    if (this.global.resetAt <= now) this.global = { count: 0, resetAt: now + MINUTE };
    const allowed =
      this.hit(this.minute, visitor, now, MINUTE, PER_VISITOR_PER_MINUTE) &&
      this.hit(this.day, visitor, now, DAY, PER_VISITOR_PER_DAY) &&
      ++this.global.count <= GLOBAL_PER_MINUTE;
    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'sky.rate_limited',
          message: 'Muchas preguntas seguidas. Respira y vuelve a intentarlo en un momento.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private hit(
    store: Map<string, Window>,
    key: string,
    now: number,
    span: number,
    limit: number,
  ): boolean {
    const entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      if (store.size >= MAX_TRACKED) {
        for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
      }
      store.set(key, { count: 1, resetAt: now + span });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }
}
