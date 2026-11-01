/** Error de la API con su código de dominio. */
export class ToritoApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const FALLBACK_MESSAGE = 'No pudimos conectar. Inténtalo de nuevo.';

/** Llamada desde el navegador a las rutas `/establo-api`, que la tienda reenvía con la cookie. */
export async function toritoRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ToritoApiError(0, 'api.unavailable', FALLBACK_MESSAGE);
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ToritoApiError(
      response.status,
      error?.code ?? 'api.error',
      error?.message ?? FALLBACK_MESSAGE,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
