import { DomainError } from '../shared/domain-error.js';
import { type Currency } from '../shared/money.js';
import { type Customer, type CustomerDraft } from './customer.js';

export const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_CHANNELS = [
  'WHATSAPP',
  'STORE',
  'INSTAGRAM',
  'FACEBOOK',
  'IN_PERSON',
  'OTHER',
] as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const PAYMENT_METHODS = ['YAPE', 'PLIN', 'TRANSFER', 'CASH', 'CARD', 'OTHER'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderLine {
  id: string;
  productId: string;
  /** Copia del momento de la venta: el producto puede cambiar después. */
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  channel: OrderChannel;
  paymentMethod: PaymentMethod | null;
  customer: Customer | null;
  currency: Currency;
  lines: OrderLine[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  note: string | null;
  soldAt: Date;
  createdByName: string | null;
  createdAt: Date;
}

export interface OrderLineDraft {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderDraft {
  status: Exclude<OrderStatus, 'CANCELLED'>;
  channel: OrderChannel;
  paymentMethod: PaymentMethod | null;
  /** Cliente ya existente; tiene prioridad sobre `customer`. */
  customerId: string | null;
  /** Cliente nuevo o reutilizado por teléfono. Ambos null = venta sin cliente (mostrador). */
  customer: CustomerDraft | null;
  currency: Currency;
  lines: OrderLineDraft[];
  shippingCents: number;
  discountCents: number;
  note: string | null;
  soldAt: Date;
}

export interface OrderTotals {
  subtotalCents: number;
  totalCents: number;
}

const MAX_LINES = 50;
const MAX_QUANTITY = 10_000;

function invalid(message: string, field: string): never {
  throw new DomainError(message, `order.invalid_${field}`);
}

export function orderTotals(
  draft: Pick<OrderDraft, 'lines' | 'shippingCents' | 'discountCents'>,
): OrderTotals {
  const subtotalCents = draft.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceCents,
    0,
  );
  return {
    subtotalCents,
    totalCents: subtotalCents + draft.shippingCents - draft.discountCents,
  };
}

export function validateOrderDraft(draft: OrderDraft, now: Date): OrderDraft {
  if (draft.lines.length === 0) invalid('Añade al menos un producto', 'lines');
  if (draft.lines.length > MAX_LINES) invalid(`Máximo ${MAX_LINES} productos por venta`, 'lines');
  const ids = draft.lines.map((line) => line.productId);
  if (new Set(ids).size !== ids.length) {
    invalid('Hay un producto repetido: suma la cantidad en una sola línea', 'lines');
  }
  for (const line of draft.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > MAX_QUANTITY) {
      invalid('La cantidad debe ser un número entero mayor que cero', 'quantity');
    }
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      invalid('El precio unitario no puede ser negativo', 'price');
    }
  }
  if (!Number.isInteger(draft.shippingCents) || draft.shippingCents < 0) {
    invalid('El envío no puede ser negativo', 'shipping');
  }
  if (!Number.isInteger(draft.discountCents) || draft.discountCents < 0) {
    invalid('El descuento no puede ser negativo', 'discount');
  }
  if (orderTotals(draft).totalCents < 0) invalid('El total no puede ser negativo', 'discount');
  if (draft.note !== null && draft.note.length > 1000) {
    invalid('La nota tiene máximo 1000 caracteres', 'note');
  }
  if (draft.soldAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    invalid('La fecha de venta no puede estar en el futuro', 'sold_at');
  }
  return draft;
}

/** Una venta cancelada ya devolvió su stock: no se puede reabrir, se registra otra. */
export function assertCanChangeStatus(current: OrderStatus, next: OrderStatus): void {
  if (current === 'CANCELLED') {
    throw new DomainError('Esta venta está cancelada y no se puede cambiar', 'order.cancelled');
  }
  if (current === next) {
    throw new DomainError('La venta ya tiene ese estado', 'order.same_status');
  }
}
