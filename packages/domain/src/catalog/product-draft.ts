import { DomainError } from '../shared/domain-error.js';
import { DEFAULT_LOCALE, type Localized, SUPPORTED_LOCALES } from '../shared/locale.js';
import { type Money } from '../shared/money.js';
import { type ProductBadge, type ProductContent, type ProductStatus } from './product.js';

/** Datos editables de un producto desde el panel de administración. */
export interface ProductDraft {
  sku: string;
  categoryId: string;
  price: Money;
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
  badge: ProductBadge | null;
  origin: string | null;
  content: Localized<ProductContent>;
}

const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function invalid(message: string, field: string): never {
  throw new DomainError(message, `product.invalid_${field}`);
}

export function validateProductDraft(draft: ProductDraft): ProductDraft {
  if (!SKU_PATTERN.test(draft.sku) || draft.sku.length > 32) {
    invalid('El SKU solo admite mayúsculas, números y guiones (máx. 32)', 'sku');
  }
  if (draft.price.amountInCents <= 0) invalid('El precio debe ser mayor que cero', 'price');
  if (!Number.isInteger(draft.stock) || draft.stock < 0)
    invalid('El stock no puede ser negativo', 'stock');
  if (draft.origin !== null && draft.origin.length > 120)
    invalid('El origen es demasiado largo', 'origin');

  for (const locale of SUPPORTED_LOCALES) {
    const content = draft.content[locale];
    if (!content) {
      if (locale === DEFAULT_LOCALE) invalid('Falta el contenido en español', 'content');
      continue;
    }
    const name = content.name.trim();
    if (name.length === 0 || name.length > 120) {
      invalid(`El nombre (${locale}) es obligatorio y tiene máximo 120 caracteres`, 'name');
    }
    if (!SLUG_PATTERN.test(content.slug) || content.slug.length > 140) {
      invalid(`El slug (${locale}) solo admite minúsculas, números y guiones`, 'slug');
    }
    if (content.description.length > 4000) {
      invalid(`La descripción (${locale}) tiene máximo 4000 caracteres`, 'description');
    }
  }
  return draft;
}
