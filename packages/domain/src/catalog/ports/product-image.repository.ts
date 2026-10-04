import { type ImageAlt, type ImageContentType, type ProductImage } from '../product-image.js';

export interface NewProductImage {
  storageKey: string;
  width: number;
  height: number;
  contentType: ImageContentType;
  sizeBytes: number;
  alt: ImageAlt;
}

export interface StoredProductImage {
  productId: string;
  image: ProductImage;
}

export interface ProductImageRepository {
  /** Agrega la foto al final de la galería del producto. */
  add(productId: string, image: NewProductImage): Promise<ProductImage>;
  findById(id: string): Promise<StoredProductImage | null>;
  listByProduct(productId: string): Promise<ProductImage[]>;
  /** `orderedIds` debe contener exactamente las fotos del producto. */
  reorder(productId: string, orderedIds: string[]): Promise<ProductImage[]>;
  updateAlt(id: string, alt: ImageAlt): Promise<ProductImage>;
  delete(id: string): Promise<void>;
}
