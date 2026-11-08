import { type ProductPiece } from '../product-piece.js';

/** Genera códigos aleatorios que no se puedan adivinar a partir de otra etiqueta. */
export interface PieceCodeGenerator {
  generate(): string;
}

export interface ProductPieceRepository {
  /** Ordenadas por `serial`, de la más nueva a la más antigua. */
  listByProduct(productId: string): Promise<ProductPiece[]>;
  findById(id: string): Promise<ProductPiece | null>;
  /** Si el QR de este producto abre la experiencia del torito (según su categoría). */
  opensToritoExperience(productId: string): Promise<boolean>;
  /**
   * Crea una pieza por código con números correlativos. Lanza `piece.duplicate_batch` si otra
   * generación simultánea tomó los mismos números.
   */
  createBatch(productId: string, codes: readonly string[]): Promise<ProductPiece[]>;
  markVoided(id: string): Promise<ProductPiece>;
}
