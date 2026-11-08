import {
  type AddSkyBondRequest,
  type AddSkyQuestionRequest,
  type AskSkyRequest,
  type AskSkyResponse,
  CUSTOMER_AUTH_ROUTES,
  CUSTOMER_SIGNED_IN_COOKIE,
  type CustomerMeDto,
  type SaveSkyProfileRequest,
  SKY_ROUTES,
  type SkyBondDto,
  type SkyDataResponse,
  type SkyProfileDto,
  type SkyQuestionDto,
} from '@antrina/contracts';
import { useEffect, useState } from 'react';

/**
 * Sesión de cliente en el navegador (la misma cuenta de Google de `/cuenta` y `/mundos`). Todo va
 * por el dominio de la tienda (`/auth/*`, `/cielo-api/*`), que lo reenvía a la API: la cookie es de
 * primera parte y vale para el bosque, cada mundo y "Tu cielo" sin volver a entrar.
 */

const hasSignedInCookie = () =>
  typeof document !== 'undefined' &&
  document.cookie.split('; ').includes(`${CUSTOMER_SIGNED_IN_COOKIE}=1`);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new Error(body?.code ?? `HTTP ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** Entrar con Google y volver a la página actual (o a `next`). */
export function googleLoginUrl(next?: string): string {
  const back =
    next ??
    (typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`.replace(/[?&]error=[^&]*/, ''));
  return `${CUSTOMER_AUTH_ROUTES.googleStart}?next=${encodeURIComponent(back || '/')}`;
}

/* ---------------------------------------------------------------- estado compartido */

export interface AccountState {
  status: 'loading' | 'ready';
  account: CustomerMeDto | null;
  /** El acceso con Google existe en la tienda (si falla, `/cuenta` lo explica). */
  googleEnabled: boolean;
}

let state: AccountState = { status: 'loading', account: null, googleEnabled: true };
let pending: Promise<AccountState> | null = null;
const listeners = new Set<(next: AccountState) => void>();

function publish(next: AccountState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

/** Una sola consulta por página; sin la cookie `antrina_signed_in` ni pregunta (invitado). */
export function loadAccount(): Promise<AccountState> {
  if (pending) return pending;
  pending = (
    hasSignedInCookie()
      ? call<CustomerMeDto>(CUSTOMER_AUTH_ROUTES.me).catch(() => null)
      : Promise.resolve(null)
  ).then((account) => {
    const next: AccountState = { status: 'ready', account, googleEnabled: true };
    publish(next);
    return next;
  });
  return pending;
}

export function useAccount(): AccountState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    void loadAccount();
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}

export async function logout(): Promise<void> {
  await fetch(`${CUSTOMER_AUTH_ROUTES.logout}?next=/`, {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'manual',
  }).catch(() => undefined);
  const next: AccountState = { ...state, account: null };
  pending = Promise.resolve(next);
  publish(next);
}

/* ---------------------------------------------------------------- Tu cielo */

export const skyApi = {
  get: () => call<SkyDataResponse>(SKY_ROUTES.sky),
  saveProfile: (profile: SaveSkyProfileRequest) =>
    call<SkyProfileDto>(SKY_ROUTES.sky, { method: 'PUT', body: JSON.stringify(profile) }),
  forget: () => call<void>(SKY_ROUTES.sky, { method: 'DELETE' }),
  addQuestion: (input: AddSkyQuestionRequest) =>
    call<SkyQuestionDto>(SKY_ROUTES.questions, { method: 'POST', body: JSON.stringify(input) }),
  addBond: (input: AddSkyBondRequest) =>
    call<SkyBondDto>(SKY_ROUTES.bonds, { method: 'POST', body: JSON.stringify(input) }),
  deleteBond: (id: string) => call<void>(SKY_ROUTES.bond(id), { method: 'DELETE' }),
  /** Respuesta de la IA (o `answer: null` si no está disponible). Sin sesión. */
  ask: (input: AskSkyRequest) =>
    call<AskSkyResponse>(SKY_ROUTES.ask, { method: 'POST', body: JSON.stringify(input) }),
};
