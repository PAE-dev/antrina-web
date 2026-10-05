import { type ImageAlt } from '../../catalog/product-image.js';
import { type SiteImage, type SiteImageSlot } from '../site-image.js';

export type NewSiteImage = Omit<SiteImage, 'updatedAt'>;

export interface SiteImageRepository {
  findAll(): Promise<SiteImage[]>;
  findBySlot(slot: SiteImageSlot): Promise<SiteImage | null>;
  /** Reemplaza la foto del hueco (si había una) y devuelve la nueva. */
  replace(image: NewSiteImage): Promise<SiteImage>;
  updateAlt(slot: SiteImageSlot, alt: ImageAlt): Promise<SiteImage>;
  delete(slot: SiteImageSlot): Promise<void>;
}
