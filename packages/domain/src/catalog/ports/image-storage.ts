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
  /** `prefix` es la carpeta dentro del bucket (`products/<id>`, `site/<slot>`). */
  createUploadTarget(input: {
    prefix: string;
    contentType: ImageContentType;
    sizeBytes: number;
  }): Promise<ImageUploadTarget>;
  /** Guarda desde el servidor lo que ya se validó aquí; devuelve la clave del objeto. */
  putImage(input: {
    prefix: string;
    contentType: ImageContentType;
    bytes: Uint8Array;
  }): Promise<string>;
  stat(storageKey: string): Promise<StoredObject | null>;
  delete(storageKey: string): Promise<void>;
}
