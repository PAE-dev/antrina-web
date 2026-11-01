import { TORITO_ROUTES } from '@antrina/contracts';
import type { APIRoute } from 'astro';
import { forwardToApi } from '../../lib/api-proxy';

export const prerender = false;

const SAFE_PATH = new RegExp(`^${TORITO_ROUTES.prefix}/[A-Za-z0-9_/-]+$`);

export const ALL: APIRoute = async ({ request, url }) => {
  if (!SAFE_PATH.test(url.pathname)) return new Response(null, { status: 404 });
  try {
    return await forwardToApi(request, url);
  } catch {
    return Response.json(
      { code: 'api.unavailable', message: 'No pudimos conectar. Inténtalo de nuevo.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
};
