import { type StockChange, type StockMovement } from '../stock-movement.js';

export interface StockMovementCriteria {
  productId?: string;
  limit: number;
  offset: number;
}

export interface StockMovementPage {
  items: StockMovement[];
  total: number;
}

export interface StockRepository {
  /**
   * Aplica el cambio de forma atómica. Lanza `stock.insufficient` si dejaría el stock en negativo
   * y `product.not_found` si el producto no existe.
   */
  apply(change: StockChange): Promise<StockMovement>;
  /**
   * Deja en cero los productos en una sola transacción, con un ajuste por cada uno que tenga stock.
   * Lanza `stock.changed` si una venta u otro ajuste tocó el stock a la vez.
   */
  clear(
    productIds: readonly string[],
    note: string | null,
    actorId: string,
  ): Promise<StockMovement[]>;
  list(criteria: StockMovementCriteria): Promise<StockMovementPage>;
}
