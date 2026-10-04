import { type Locale } from '../shared/locale.js';
import { type Money } from '../shared/money.js';

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
}

export interface Customer {
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
  customer: Customer;
  lines: OrderLine[];
  total: Money;
  createdAt: Date;
}
