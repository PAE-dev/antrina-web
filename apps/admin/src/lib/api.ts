import { type ApiErrorDto } from '@antrina/contracts';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  429: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
  500: 'Algo salió mal en el servidor. Inténtalo de nuevo.',
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** La sesión viaja en una cookie httpOnly: siempre `credentials: 'include'`. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'No se pudo conectar con la API.');
  }

  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as (T & Partial<ApiErrorDto>) | null;
  if (!response.ok) {
    const message =
      (data?.code ? data.message : undefined) ??
      FALLBACK_MESSAGES[response.status] ??
      FALLBACK_MESSAGES[500] ??
      'Error inesperado';
    throw new ApiError(response.status, data?.code ?? `http.${response.status}`, message);
  }
  return data as T;
}

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Error inesperado';
}
