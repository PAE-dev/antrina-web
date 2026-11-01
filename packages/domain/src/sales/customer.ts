import { DomainError } from '../shared/domain-error.js';

export interface Customer {
  id: string;
  name: string;
  /** E.164 (ej. +51987654321): la misma clave que usará WhatsApp. */
  phone: string | null;
  email: string | null;
  note: string | null;
  /** Se registró en la tienda; entonces `createdAt` es su fecha de registro. */
  hasWebAccount: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface CustomerDraft {
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
}

/** Cliente con el resumen de sus compras (sin contar las canceladas). */
export interface CustomerWithStats extends Customer {
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: Date | null;
}

const PERU_COUNTRY_CODE = '51';
const PERU_MOBILE = /^9\d{8}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Deja el teléfono en E.164. Un celular peruano de 9 dígitos se asume de Perú; cualquier otro país
 * debe escribirse con su "+". Lanza `customer.invalid_phone` si no se puede interpretar.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normalized = PERU_MOBILE.test(digits)
    ? `+${PERU_COUNTRY_CODE}${digits}`
    : `+${trimmed.startsWith('00') ? digits.slice(2) : digits}`;
  if (!E164.test(normalized)) {
    throw new DomainError(
      'Teléfono inválido: usa 9 dígitos (Perú) o el código de país con +',
      'customer.invalid_phone',
    );
  }
  return normalized;
}

export function validateCustomerDraft(draft: CustomerDraft): CustomerDraft {
  if (draft.name.length === 0 || draft.name.length > 120) {
    throw new DomainError(
      'El nombre del cliente es obligatorio (máx. 120 caracteres)',
      'customer.invalid_name',
    );
  }
  if (draft.email !== null && (draft.email.length > 160 || !draft.email.includes('@'))) {
    throw new DomainError('Correo inválido', 'customer.invalid_email');
  }
  if (draft.note !== null && draft.note.length > 1000) {
    throw new DomainError('La nota tiene máximo 1000 caracteres', 'customer.invalid_note');
  }
  return draft;
}
