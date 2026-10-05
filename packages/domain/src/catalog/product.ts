import { DomainError } from '../shared/domain-error.js';
import { type Locale, type Localized, pickLocalized } from '../shared/locale.js';
import { type Money } from '../shared/money.js';
import { type ProductImage } from './product-image.js';

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Etiqueta editorial visible en catálogo. Nunca representa descuentos. */
export const PRODUCT_BADGES = ['NEW', 'CUSTOMIZABLE', 'LIMITED_EDITION'] as const;

export type ProductBadge = (typeof PRODUCT_BADGES)[number];

export const PRODUCT_SIZES = ['MINI', 'STANDARD', 'LARGE', 'SIGNATURE'] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const ZODIAC_SIGNS = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export function isZodiacSign(value: unknown): value is ZodiacSign {
  return typeof value === 'string' && (ZODIAC_SIGNS as readonly string[]).includes(value);
}

export interface ProductContent {
  name: string;
  slug: string;
  description: string;
  /** Para buscadores; null = se usa el nombre. */
  metaTitle: string | null;
  /** Para buscadores; null = se usa la descripción. */
  metaDescription: string | null;
}

export interface ProductProps {
  id: string;
  sku: string;
  categoryId: string;
  categorySlug: string;
  price: Money;
  compareAtPrice: Money | null;
  stock: number;
  /** Ordenadas por `position`; la primera es la portada. */
  images: ProductImage[];
  status: ProductStatus;
  isFeatured: boolean;
  badge: ProductBadge | null;
  size: ProductSize | null;
  signs: readonly ZodiacSign[];
  /** Origen artesanal (ej. "Taller Antrina, Lima"). */
  origin: string | null;
  content: Localized<ProductContent>;
  updatedAt: Date;
}

export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(props: ProductProps): Product {
    if (props.compareAtPrice && !props.compareAtPrice.isGreaterThan(props.price)) {
      throw new DomainError(
        'El precio de referencia debe ser mayor al precio de venta',
        'product.invalid_compare_at_price',
      );
    }
    if (props.stock < 0) {
      throw new DomainError('El stock no puede ser negativo', 'product.negative_stock');
    }
    const images = [...props.images].sort((a, b) => a.position - b.position);
    return new Product({ ...props, images });
  }

  get id(): string {
    return this.props.id;
  }

  get sku(): string {
    return this.props.sku;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get categorySlug(): string {
    return this.props.categorySlug;
  }

  get price(): Money {
    return this.props.price;
  }

  get compareAtPrice(): Money | null {
    return this.props.compareAtPrice;
  }

  get images(): readonly ProductImage[] {
    return this.props.images;
  }

  get coverImage(): ProductImage | null {
    return this.props.images[0] ?? null;
  }

  get stock(): number {
    return this.props.stock;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get content(): Localized<ProductContent> {
    return this.props.content;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get origin(): string | null {
    return this.props.origin;
  }

  get isFeatured(): boolean {
    return this.props.isFeatured;
  }

  get badge(): ProductBadge | null {
    return this.props.badge;
  }

  get size(): ProductSize | null {
    return this.props.size;
  }

  get signs(): readonly ZodiacSign[] {
    return this.props.signs;
  }

  /** Locales con traducción propia (no fallback). */
  get locales(): Locale[] {
    return (Object.keys(this.props.content) as Locale[]).filter((l) => this.props.content[l]);
  }

  isPurchasable(): boolean {
    return this.props.status === 'ACTIVE' && this.props.stock > 0;
  }

  isOnSale(): boolean {
    return this.props.compareAtPrice !== null;
  }

  /** Porcentaje de descuento entero respecto al precio de referencia, o null si no está en oferta. */
  discountPercent(): number | null {
    const compareAt = this.props.compareAtPrice;
    if (!compareAt) return null;
    const saved = compareAt.amountInCents - this.props.price.amountInCents;
    return Math.round((saved / compareAt.amountInCents) * 100);
  }

  contentFor(locale: Locale): ProductContent {
    return pickLocalized(this.props.content, locale);
  }
}
