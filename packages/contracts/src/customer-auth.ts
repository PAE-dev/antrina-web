/** Cliente con sesión iniciada en la tienda. */
export interface CustomerMeDto {
  id: string;
  name: string;
  email: string;
}

/** Motivo que la API añade a `?error=` al volver a la tienda tras un acceso fallido. */
export type CustomerAuthError = 'cancelled' | 'unavailable' | 'failed';

export const CUSTOMER_AUTH_ROUTES = {
  googleStart: '/auth/google',
  googleCallback: '/auth/google/callback',
  me: '/auth/me',
  logout: '/auth/logout',
} as const;

/**
 * Cookie sin datos sensibles y legible desde el navegador: las páginas de la tienda se sirven
 * cacheadas, así que la cabecera la usa para saber si mostrar "Mi cuenta" en vez de "Iniciar sesión".
 */
export const CUSTOMER_SIGNED_IN_COOKIE = 'antrina_signed_in';
