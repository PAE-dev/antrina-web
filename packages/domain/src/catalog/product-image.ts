import { DomainError } from '../shared/domain-error.js';
import { type Locale } from '../shared/locale.js';

export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ImageAlt = Partial<Record<Locale, string>>;

export interface ProductImage {
  id: string;
  storageKey: string;
  position: number;
  width: number;
  height: number;
  contentType: ImageContentType;
  sizeBytes: number;
  alt: ImageAlt;
}

export function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === 'string' && (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function assertValidImageUpload(contentType: string, sizeBytes: number): ImageContentType {
  if (!isImageContentType(contentType)) {
    throw new DomainError(
      'Formato no permitido: usa JPG, PNG o WebP',
      'catalog.image_invalid_type',
    );
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_IMAGE_BYTES) {
    throw new DomainError('La foto debe pesar como máximo 10 MB', 'catalog.image_too_large');
  }
  return contentType;
}

export function assertValidImageDimensions(width: number, height: number): void {
  const valid = (value: number) => Number.isInteger(value) && value > 0 && value <= 10000;
  if (!valid(width) || !valid(height)) {
    throw new DomainError('Dimensiones de imagen inválidas', 'catalog.image_invalid_dimensions');
  }
}
