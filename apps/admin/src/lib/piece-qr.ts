import { pieceQrPath, type ProductPieceDto } from '@antrina/contracts';
import { STORE_URL } from './api';

/** Lo que va impreso en la etiqueta: la URL pública de la pieza. */
export const pieceQrUrl = (code: string) => `${STORE_URL}${pieceQrPath(code)}`;

/** Sin la tienda configurada el QR no abriría nada: no se debe imprimir ni descargar. */
export const canExportQr = STORE_URL.startsWith('http');
/** En local el QR apunta a este computador y a su base de datos, no a la tienda real. */
export const isLocalQr = /\/\/(localhost|127\.0\.0\.1)/.test(STORE_URL);

/** Solo se exportan códigos que aún pueden abrir una pieza nueva. */
export const isPrintable = (piece: ProductPieceDto) => !piece.voidedAt && !piece.claimedAt;

const SERIAL_DIGITS = 4;
/** Negro sobre blanco: lo más seguro para cualquier imprenta y cualquier lector. */
const QR_COLOR = { dark: '#000000', light: '#ffffff' };
/** Mismos ajustes que `QrCode`, para que la etiqueta impresa y el archivo sean equivalentes. */
const QR_OPTIONS = { errorCorrectionLevel: 'M', margin: 4, color: QR_COLOR } as const;
const PNG_SIZE = 1024;
const REVOKE_DELAY_MS = 10_000;

function csvField(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function buildCsv(pieces: readonly ProductPieceDto[], sku: string, name: string): string {
  const rows = pieces.map((piece) =>
    [piece.serial, piece.code, pieceQrUrl(piece.code), sku, name].map(csvField).join(','),
  );
  // El BOM hace que Excel lea bien las tildes.
  return `\uFEFF${['numero,codigo,url,sku,producto', ...rows].join('\r\n')}\r\n`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Descarga un ZIP con cada QR en PNG y SVG (para la imprenta) y una lista en CSV. El nombre de cada
 * archivo lleva el número de la pieza. Las librerías se cargan solo al descargar.
 */
export async function downloadQrZip(
  pieces: readonly ProductPieceDto[],
  product: { sku: string; name: string },
): Promise<void> {
  const [{ default: QRCode }, { strToU8, zipSync }] = await Promise.all([
    import('qrcode'),
    import('fflate'),
  ]);
  const sorted = [...pieces].sort((a, b) => a.serial - b.serial);
  const files: Record<string, Uint8Array> = {
    'codigos.csv': strToU8(buildCsv(sorted, product.sku, product.name)),
  };
  for (const piece of sorted) {
    const url = pieceQrUrl(piece.code);
    const fileName = `${product.sku}-${String(piece.serial).padStart(SERIAL_DIGITS, '0')}`;
    files[`png/${fileName}.png`] = dataUrlToBytes(
      await QRCode.toDataURL(url, { ...QR_OPTIONS, width: PNG_SIZE }),
    );
    files[`svg/${fileName}.svg`] = strToU8(
      await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' }),
    );
  }

  const first = sorted[0]?.serial ?? 0;
  const last = sorted.at(-1)?.serial ?? 0;
  const zip = zipSync(files);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  link.download = `qr-${product.sku}-${first === last ? first : `${first}-${last}`}.zip`;
  link.click();
  // Algunos navegadores empiezan la descarga después del clic: no liberar el archivo enseguida.
  window.setTimeout(() => URL.revokeObjectURL(link.href), REVOKE_DELAY_MS);
}
