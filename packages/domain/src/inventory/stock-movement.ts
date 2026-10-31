import { DomainError } from '../shared/domain-error.js';

export const STOCK_MOVEMENT_TYPES = [
  'INITIAL',
  'RESTOCK',
  'SALE',
  'SALE_CANCELLED',
  'ADJUSTMENT',
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: StockMovementType;
  /** Positivo si entra, negativo si sale. */
  quantity: number;
  stockAfter: number;
  note: string | null;
  orderId: string | null;
  orderNumber: number | null;
  adminName: string | null;
  createdAt: Date;
}

/** Cambio manual de existencias desde el panel. Las ventas mueven stock por su cuenta. */
export interface StockChange {
  productId: string;
  type: Extract<StockMovementType, 'RESTOCK' | 'ADJUSTMENT'>;
  quantity: number;
  note: string | null;
  actorId: string;
}

const MAX_QUANTITY = 100_000;

export function validateStockChange(change: StockChange): StockChange {
  if (!Number.isInteger(change.quantity) || change.quantity === 0) {
    throw new DomainError('Indica una cantidad distinta de cero', 'stock.invalid_quantity');
  }
  if (Math.abs(change.quantity) > MAX_QUANTITY) {
    throw new DomainError('La cantidad es demasiado grande', 'stock.invalid_quantity');
  }
  if (change.type === 'RESTOCK' && change.quantity < 0) {
    throw new DomainError('Una entrada debe sumar unidades', 'stock.invalid_quantity');
  }
  if (change.note !== null && change.note.length > 300) {
    throw new DomainError('La nota tiene máximo 300 caracteres', 'stock.invalid_note');
  }
  return change;
}
