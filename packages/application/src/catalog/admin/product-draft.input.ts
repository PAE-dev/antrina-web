import { type UpsertProductRequest } from '@antrina/contracts';
import {
  DomainError,
  type ImageAlt,
  Money,
  PRODUCT_BADGES,
  PRODUCT_STATUSES,
  type Product,
  type ProductContent,
  type ProductDraft,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  validateProductDraft,
} from '@antrina/domain';
import {
  optionalString,
  requireBoolean,
  requireInteger,
  requireOneOf,
  requireString,
} from '../../shared/input.js';

const MAX_ALT_LENGTH = 200;

function parseContent(value: unknown, locale: string): ProductContent {
  if (typeof value !== 'object' || value === null) {
    throw new DomainError(`Falta el contenido (${locale})`, 'product.invalid_content');
  }
  const raw = value as Record<string, unknown>;
  return {
    name: requireString(raw.name, `content.${locale}.name`, 200).trim(),
    slug: requireString(raw.slug, `content.${locale}.slug`, 200).trim().toLowerCase(),
    description: requireString(raw.description ?? '', `content.${locale}.description`).trim(),
  };
}

/** Convierte el body HTTP (no confiable) en un borrador de dominio validado. */
export function toProductDraft(input: UpsertProductRequest): ProductDraft {
  if (typeof input !== 'object' || input === null) {
    throw new DomainError('Cuerpo de la petición inválido', 'input.invalid');
  }
  const content = input.content as unknown;
  if (typeof content !== 'object' || content === null) {
    throw new DomainError('Falta el contenido', 'product.invalid_content');
  }
  const rawContent = content as Record<string, unknown>;
  const en = rawContent.en ? parseContent(rawContent.en, 'en') : null;

  const draft: ProductDraft = {
    sku: requireString(input.sku, 'sku', 64).trim().toUpperCase(),
    categoryId: requireString(input.categoryId, 'categoryId', 64),
    price: Money.ofCents(
      requireInteger(input.priceCents, 'priceCents'),
      requireOneOf(input.currency, SUPPORTED_CURRENCIES, 'currency'),
    ),
    stock: requireInteger(input.stock, 'stock'),
    status: requireOneOf(input.status, PRODUCT_STATUSES, 'status'),
    isFeatured: requireBoolean(input.isFeatured, 'isFeatured'),
    badge: input.badge === null ? null : requireOneOf(input.badge, PRODUCT_BADGES, 'badge'),
    origin: optionalString(input.origin, 'origin', 200)?.trim() || null,
    content: { es: parseContent(rawContent.es, 'es'), ...(en ? { en } : {}) },
  };
  return validateProductDraft(draft);
}

export function draftFromProduct(product: Product): ProductDraft {
  return {
    sku: product.sku,
    categoryId: product.categoryId,
    price: product.price,
    stock: product.stock,
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge,
    origin: product.origin,
    content: product.content,
  };
}

export function parseImageAlt(value: unknown): ImageAlt {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object')
    throw new DomainError('Texto alternativo inválido', 'input.invalid');
  const raw = value as Record<string, unknown>;
  const alt: ImageAlt = {};
  for (const locale of SUPPORTED_LOCALES) {
    const text = optionalString(raw[locale], `alt.${locale}`, MAX_ALT_LENGTH)?.trim();
    if (text) alt[locale] = text;
  }
  return alt;
}
