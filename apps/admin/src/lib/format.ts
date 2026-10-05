import {
  type ProductBadgeCode,
  type ProductSizeCode,
  type ProductStatusCode,
  type ZodiacSignCode,
} from '@antrina/contracts';

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
