import {
  CUSTOMER_AUTH_ROUTES,
  type CustomerAuthError,
  type CustomerMeDto,
  type LocaleCode,
  type PublicImageDto,
} from '@antrina/contracts';
import { getSiteImages } from './catalog';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = 8000;
const AUTH_ERRORS: readonly CustomerAuthError[] = ['cancelled', 'unavailable', 'failed'];

export type CurrentCustomerResult =
  { status: 'ok'; customer: CustomerMeDto } | { status: 'guest' } | { status: 'unavailable' };

/** Consulta la sesión con la cookie del visitante. Un fallo de la API no es "sin sesión". */
export async function getCurrentCustomer(cookie: string | null): Promise<CurrentCustomerResult> {
  if (!cookie) return { status: 'guest' };
  try {
    const response = await fetch(new URL(CUSTOMER_AUTH_ROUTES.me, API_URL), {
      headers: { cookie },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 401) return { status: 'guest' };
    if (!response.ok) return { status: 'unavailable' };
    return { status: 'ok', customer: (await response.json()) as CustomerMeDto };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Datos de `/cuenta`: la sesión y la foto del panel lateral (la del taller o, si no, la portada). */
export async function loadAccountPage(
  locale: LocaleCode,
  cookie: string | null,
): Promise<{ session: CurrentCustomerResult; photo: PublicImageDto | undefined }> {
  const [session, images] = await Promise.all([getCurrentCustomer(cookie), getSiteImages(locale)]);
  return { session, photo: images.story ?? images.hero };
}

export function parseAuthError(value: string | null): CustomerAuthError | null {
  return AUTH_ERRORS.find((error) => error === value) ?? null;
}
