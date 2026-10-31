import {
  type AdminRoleCode,
  type OrderChannelCode,
  type OrderStatusCode,
  type PaymentMethodCode,
  type ProductBadgeCode,
  type ProductIntentionCode,
  type ProductSizeCode,
  type ProductStatusCode,
  type StockMovementTypeCode,
  type ZodiacSignCode,
} from '@antrina/contracts';

export const ADMIN_ROLE_LABELS: Record<AdminRoleCode, string> = {
  OWNER: 'Propietario',
  EDITOR: 'Editor',
};

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagada',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

export const CHANNEL_LABELS: Record<OrderChannelCode, string> = {
  WHATSAPP: 'WhatsApp',
  STORE: 'Tienda web',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  IN_PERSON: 'En persona',
  OTHER: 'Otro',
};

export const PAYMENT_LABELS: Record<PaymentMethodCode, string> = {
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

export const MOVEMENT_LABELS: Record<StockMovementTypeCode, string> = {
  INITIAL: 'Stock inicial',
  RESTOCK: 'Entrada',
  SALE: 'Venta',
  SALE_CANCELLED: 'Venta cancelada',
  ADJUSTMENT: 'Ajuste',
};

export const INTENTION_LABELS: Record<ProductIntentionCode, string> = {
  abundancia: 'Abundancia',
  amor: 'Amor',
  proteccion: 'Protección',
  felicidad: 'Felicidad',
  mixto: 'Mixto',
};

export const SIZE_LABELS: Record<ProductSizeCode, string> = {
  MINI: 'Mini',
  STANDARD: 'Estándar',
  LARGE: 'Grande',
  SIGNATURE: 'Edición Firma',
};

export const SIGN_LABELS: Record<ZodiacSignCode, string> = {
  ARIES: 'Aries',
  TAURUS: 'Tauro',
  GEMINI: 'Géminis',
  CANCER: 'Cáncer',
  LEO: 'Leo',
  VIRGO: 'Virgo',
  LIBRA: 'Libra',
  SCORPIO: 'Escorpio',
  SAGITTARIUS: 'Sagitario',
  CAPRICORN: 'Capricornio',
  AQUARIUS: 'Acuario',
  PISCES: 'Piscis',
};

export const STATUS_LABELS: Record<ProductStatusCode, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Publicado',
  ARCHIVED: 'Archivado',
};

export const BADGE_LABELS: Record<ProductBadgeCode, string> = {
  NEW: 'Nuevo',
  CUSTOMIZABLE: 'Personalizable',
  LIMITED_EDITION: 'Edición limitada',
};

/** "árbol del Amor" -> "arbol-del-amor" */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

/** "289" | "289.50" | "289,50" -> 28950 céntimos; null si no es válido. */
export function parsePriceToCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number.parseFloat(normalized) * 100);
}

export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** "+51987654321" -> "+51 987 654 321"; otros países se muestran tal cual. */
export function formatPhone(phone: string): string {
  const peru = /^\+51(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return peru ? `+51 ${peru[1]} ${peru[2]} ${peru[3]}` : phone;
}

/** Enlace que abre el chat en WhatsApp, con un mensaje listo para editar. */
export function whatsappUrl(phone: string, text?: string): string {
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${phone.replace(/^\+/, '')}${query}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** "2026-10-31" (día de Lima) -> "31 oct". */
export function formatDayKey(day: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${day}T00:00:00Z`))
    .replace('.', '');
}

/** Valor de `<input type="datetime-local">` a partir de una fecha, en la hora del navegador. */
export function toDateTimeInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(iso))
    .replace('.', '');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
