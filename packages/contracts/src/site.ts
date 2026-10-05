import { type PublicImageDto } from './catalog.js';
import { type LocaleCode } from './common.js';

/** Huecos con foto editorial en la tienda. */
export type SiteImageSlotCode = 'hero' | 'story' | 'corporate';

export const SITE_IMAGE_SLOT_CODES: readonly SiteImageSlotCode[] = ['hero', 'story', 'corporate'];

export interface SiteImagesQuery {
  locale?: LocaleCode;
}

/** Solo trae los huecos que tienen foto. */
export type SiteImagesResponse = Partial<Record<SiteImageSlotCode, PublicImageDto>>;

export const SITE_ROUTES = {
  images: '/site/images',
} as const;
