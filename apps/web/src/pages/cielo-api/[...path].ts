import { SKY_ROUTES } from '@antrina/contracts';
import type { APIRoute } from 'astro';
import { forwardToApi } from '../../lib/api-proxy';

export const prerender = false;

const SAFE_PATH = new RegExp(
  `^${SKY_ROUTES.prefix}/(ask|sky(/questions|/bonds(/[A-Za-z0-9_-]+)?|/days/\\d{4}-\\d{2}-\\d{2})?)$`,
);

/** "Tu cielo": se reenvía a la API desde el dominio de la tienda (cookie de primera parte). */
export const ALL: APIRoute = async ({ request, url, clientAddress }) => {
  if (!SAFE_PATH.test(url.pathname)) return new Response(null, { status: 404 });
  try {
    return await forwardToApi(request, url, clientAddress);
  } catch {
    return Response.json(
      { code: 'api.unavailable', message: 'No pudimos conectar. Inténtalo de nuevo.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
};
