import { type Locale } from '../shared/locale.js';
import { type Money } from '../shared/money.js';

export interface CheckoutLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
}

export interface CheckoutCustomer {
  fullName: string;
  email: string;
  /** Número en formato E.164 (ej. +51987654321), usado para WhatsApp. */
  phone: string;
  country: string;
}

/**
 * Modelo mínimo de pedido. Se amplía en la fase de checkout (estados, envío, impuestos).
 */
export interface OrderSummary {
  id: string;
  locale: Locale;
  customer: CheckoutCustomer;
  lines: CheckoutLine[];
  total: Money;
  createdAt: Date;
}
