import { type ImageAlt, type ImageContentType } from '../catalog/product-image.js';

/** Huecos editoriales de la tienda que se gestionan desde el panel. */
export const SITE_IMAGE_SLOTS = ['hero', 'story', 'corporate'] as const;

export type SiteImageSlot = (typeof SITE_IMAGE_SLOTS)[number];

export function isSiteImageSlot(value: unknown): value is SiteImageSlot {
  return typeof value === 'string' && (SITE_IMAGE_SLOTS as readonly string[]).includes(value);
}

export interface SiteImage {
  slot: SiteImageSlot;
  storageKey: string;
  width: number;
  height: number;
  contentType: ImageContentType;
  sizeBytes: number;
  alt: ImageAlt;
  updatedAt: Date;
}
