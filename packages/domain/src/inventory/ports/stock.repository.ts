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
  list(criteria: StockMovementCriteria): Promise<StockMovementPage>;
}
