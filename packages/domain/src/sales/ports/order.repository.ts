import { type Order, type OrderChannel, type OrderDraft, type OrderStatus } from '../order.js';

export interface OrderCriteria {
  query?: string;
  status?: OrderStatus;
  channel?: OrderChannel;
  customerId?: string;
  limit: number;
  offset: number;
}

export interface OrderPage {
  items: Order[];
  total: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** Cifras de un periodo, sin contar las ventas canceladas. */
export interface SalesTotals {
  orderCount: number;
  unitCount: number;
  revenueCents: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  unitCount: number;
  revenueCents: number;
}

export interface OrderRepository {
  /**
   * Crea la venta y descuenta el stock en una sola transacción, con su movimiento por línea y el
   * cliente (se reutiliza si el teléfono ya existe). Lanza `order.insufficient_stock` si no hay
   * unidades y `product.not_found` si un producto no existe o está archivado.
   */
  create(draft: OrderDraft, actorId: string): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  list(criteria: OrderCriteria): Promise<OrderPage>;
  updateStatus(id: string, status: Exclude<OrderStatus, 'CANCELLED'>): Promise<Order>;
  /** Marca la venta como cancelada y devuelve sus unidades al stock en una sola transacción. */
  cancel(id: string, actorId: string): Promise<Order>;
  totals(range: DateRange): Promise<SalesTotals>;
  /** Ingresos por día (día civil de `utcOffsetMinutes`), solo días con ventas. */
  dailyRevenue(
    range: DateRange,
    utcOffsetMinutes: number,
  ): Promise<{ day: string; revenueCents: number; orderCount: number }[]>;
  topProducts(range: DateRange, limit: number): Promise<TopProduct[]>;
}
