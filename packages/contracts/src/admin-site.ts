import { type ImageAltDto } from './admin-catalog.js';
import { type SiteImageSlotCode } from './site.js';

export interface AdminSiteImageDto {
  slot: SiteImageSlotCode;
  url: string;
  width: number;
  height: number;
  alt: ImageAltDto;
  updatedAt: string;
}

export interface AdminSiteImagesResponse {
  data: AdminSiteImageDto[];
}

/** Paso 2 de la subida (el paso 1 reutiliza `ImageUploadRequest` / `ImageUploadTargetDto`). */
export interface SetSiteImageRequest {
  storageKey: string;
  width: number;
  height: number;
  alt: ImageAltDto;
}

export const ADMIN_SITE_ROUTES = {
  images: '/admin/site/images',
  image: (slot: SiteImageSlotCode) => `/admin/site/images/${slot}`,
  imageUploadUrl: (slot: SiteImageSlotCode) => `/admin/site/images/${slot}/upload-url`,
} as const;
