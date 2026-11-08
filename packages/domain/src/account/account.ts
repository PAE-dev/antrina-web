/**
 * Cuenta de cliente de la tienda (acceso con Google). Una sola sesión sirve para todo el sitio: el
 * bosque, los mundos y "Tu cielo". Si el correo coincide con un cliente registrado en ventas, se
 * enlazan y la persona ve sus compras.
 */
export interface CustomerAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** `sub` de Google: identificador estable de la persona. */
  googleSub: string;
  /** Cliente de ventas enlazado (sus pedidos son "mis compras"). */
  customerId: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface CustomerSession {
  id: string;
  accountId: string;
  expiresAt: Date;
  lastSeenAt: Date;
}

export const ACCOUNT_SECURITY = {
  /** La sesión dura 30 días y se renueva sola mientras se use. */
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  /** Se extiende como mucho una vez al día (evita escribir en cada petición). */
  renewAfterMs: 24 * 60 * 60 * 1000,
} as const;

export function isCustomerSessionActive(session: CustomerSession, now: Date): boolean {
  return session.expiresAt > now;
}

/** Identidad verificada que devuelve el proveedor (Google). */
export interface VerifiedIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}
