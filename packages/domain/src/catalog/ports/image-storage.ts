import { type ImageContentType } from '../product-image.js';

export interface ImageUploadTarget {
  storageKey: string;
  /** URL firmada para subir el archivo con PUT directamente al almacenamiento. */
  uploadUrl: string;
  /** Cabeceras que el cliente debe enviar tal cual en el PUT. */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string;
}

export interface ImageUrlResolver {
  publicUrl(storageKey: string): string;
}

/** Almacenamiento de objetos (MinIO en local, Cloudflare R2 en producción). */
export interface ImageStorage extends ImageUrlResolver {
  createUploadTarget(input: {
    productId: string;
    contentType: ImageContentType;
    sizeBytes: number;
  }): Promise<ImageUploadTarget>;
  stat(storageKey: string): Promise<StoredObject | null>;
  delete(storageKey: string): Promise<void>;
}
