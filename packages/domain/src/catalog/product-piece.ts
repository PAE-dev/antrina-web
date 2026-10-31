/**
 * Pieza física con QR propio. `code` va en la etiqueta y abre la experiencia digital de esa pieza;
 * `serial` es su número correlativo dentro del producto.
 */
export interface ProductPiece {
  id: string;
  productId: string;
  serial: number;
  code: string;
  /** Un código anulado (etiqueta perdida o dañada) deja de ser válido. */
  voidedAt: Date | null;
  createdAt: Date;
}

export const MAX_PIECES_PER_BATCH = 200;
