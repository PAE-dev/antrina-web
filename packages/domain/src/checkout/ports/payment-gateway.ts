import { type Money } from '../../shared/money.js';
import { type Customer } from '../order.js';

export interface ChargeRequest {
  orderId: string;
  amount: Money;
  customer: Customer;
  /** Token de tarjeta/billetera generado en el frontend por la pasarela (Culqi, Niubiz, Yape...). */
  sourceToken: string;
}

export type ChargeResult =
  | { status: 'succeeded'; providerReference: string }
  | { status: 'pending'; providerReference: string }
  | { status: 'failed'; reason: string };

export interface PaymentGateway {
  readonly provider: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
