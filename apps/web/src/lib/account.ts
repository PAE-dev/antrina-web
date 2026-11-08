import {
  ACCOUNT_ROUTES,
  type AccountDto,
  type AddSkyBondRequest,
  type AddSkyQuestionRequest,
  type MeResponse,
  type MyOrderDto,
  type MyOrdersResponse,
  type SaveSkyProfileRequest,
  type SkyBondDto,
  type SkyDataResponse,
  type SkyProfileDto,
  type SkyQuestionDto,
} from '@antrina/contracts';
import { useEffect, useState } from 'react';

/**
 * Cuenta de cliente en el navegador. La sesión es una cookie httpOnly de la API que vale para todo
 * el sitio: el bosque, cada mundo y "Tu cielo" leen la misma cuenta sin volver a entrar.
 */

const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new Error(body?.code ?? `HTTP ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** URL para entrar con Google y volver a la página actual (o a `returnTo`). */
export function googleLoginUrl(returnTo?: string): string {
  const back =
    returnTo ??
    (typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`.replace(/[?&]login=[^&]*/, ''));
  return `${API_URL}${ACCOUNT_ROUTES.googleStart}?returnTo=${encodeURIComponent(back || '/')}`;
}

/* ---------------------------------------------------------------- estado compartido */

export interface AccountState {
  status: 'loading' | 'ready';
  account: AccountDto | null;
  googleEnabled: boolean;
}

let state: AccountState = { status: 'loading', account: null, googleEnabled: false };
let pending: Promise<AccountState> | null = null;
const listeners = new Set<(next: AccountState) => void>();

function publish(next: AccountState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

/** Una sola petición a `/me` por página, compartida por todas las islas. */
export function loadAccount(force = false): Promise<AccountState> {
  if (!force && pending) return pending;
  pending = call<MeResponse>(ACCOUNT_ROUTES.me)
    .then((me) => ({
      status: 'ready' as const,
      account: me.account,
      googleEnabled: me.googleEnabled,
    }))
    .catch(() => ({ status: 'ready' as const, account: null, googleEnabled: false }))
    .then((next) => {
      publish(next);
      return next;
    });
  return pending;
}

export function useAccount(): AccountState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    void loadAccount();
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}

export async function logout(): Promise<void> {
  await call<void>(ACCOUNT_ROUTES.logout, { method: 'POST' }).catch(() => undefined);
  pending = Promise.resolve({ ...state, account: null });
  publish({ ...state, account: null });
}

/* ---------------------------------------------------------------- Tu cielo y compras */

export const accountApi = {
  sky: () => call<SkyDataResponse>(ACCOUNT_ROUTES.sky),
  saveSky: (profile: SaveSkyProfileRequest) =>
    call<SkyProfileDto>(ACCOUNT_ROUTES.sky, { method: 'PUT', body: JSON.stringify(profile) }),
  forgetSky: () => call<void>(ACCOUNT_ROUTES.sky, { method: 'DELETE' }),
  addQuestion: (input: AddSkyQuestionRequest) =>
    call<SkyQuestionDto>(ACCOUNT_ROUTES.skyQuestions, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  addBond: (input: AddSkyBondRequest) =>
    call<SkyBondDto>(ACCOUNT_ROUTES.skyBonds, { method: 'POST', body: JSON.stringify(input) }),
  deleteBond: (id: string) => call<void>(ACCOUNT_ROUTES.skyBond(id), { method: 'DELETE' }),
  orders: async (): Promise<MyOrderDto[]> =>
    (await call<MyOrdersResponse>(ACCOUNT_ROUTES.orders)).data,
};
