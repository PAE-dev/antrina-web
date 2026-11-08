/** Cliente de la tienda que puede iniciar sesión. Es la misma fila que ve el panel en Clientes. */
export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarKey: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  addressReference: string | null;
}

/** Lo que el cliente puede cambiar de su cuenta. El correo viene de Google. */
export type CustomerProfile = Pick<
  CustomerAccount,
  'name' | 'phone' | 'city' | 'district' | 'addressLine' | 'addressReference'
>;

export interface CustomerSession {
  id: string;
  customerId: string;
  expiresAt: Date;
}

export const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isCustomerSessionActive(session: CustomerSession, now: Date): boolean {
  return session.expiresAt > now;
}
