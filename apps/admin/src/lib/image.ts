export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EDGE = 2400;
const WEBP_QUALITY = 0.86;

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Redimensiona en el navegador (lado mayor ≤ 2400 px) y convierte a WebP antes de subir:
 * las fotos de móvil pesan 5–10 MB y la tienda no necesita más resolución.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: formato no soportado (usa JPG, PNG o WebP).`);
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite procesar imágenes.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );
  if (!blob || blob.type !== 'image/webp') {
    throw new Error('No se pudo convertir la imagen a WebP.');
  }
  return { blob, width, height };
}
