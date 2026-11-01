import { CUSTOMER_AUTH_ROUTES } from '@antrina/contracts';
import type { APIRoute } from 'astro';
import { forwardToApi } from '../../lib/api-proxy';

export const prerender = false;

const ALLOWED_PATHS: readonly string[] = Object.values(CUSTOMER_AUTH_ROUTES);

export const ALL: APIRoute = async ({ request, url }) => {
  if (!ALLOWED_PATHS.includes(url.pathname)) return new Response(null, { status: 404 });
  try {
    return await forwardToApi(request, url);
  } catch {
    return new Response(null, {
      status: 303,
      headers: { location: '/cuenta?error=failed', 'cache-control': 'no-store' },
    });
  }
};
