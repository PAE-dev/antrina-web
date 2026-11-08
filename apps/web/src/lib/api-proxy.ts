const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = 10000;
const FORWARDED_REQUEST_HEADERS = ['cookie', 'origin', 'user-agent', 'content-type'];
const FORWARDED_RESPONSE_HEADERS = ['location', 'content-type', 'cache-control', 'x-robots-tag'];

/**
 * Reenvía una petición a la API desde el dominio de la tienda: así la cookie de sesión es de primera
 * parte y llega, aunque la API viva en otro dominio. Lanza si la API no responde.
 */
export async function forwardToApi(request: Request, url: URL): Promise<Response> {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstream = await fetch(new URL(`${url.pathname}${url.search}`, API_URL), {
    method: request.method,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(hasBody ? { body: await request.arrayBuffer() } : {}),
  });

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }
  return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}
