import { type OrderSummary } from '../../checkout/order.js';

export interface OrderNotifier {
  readonly channel: string;
  notifyOrderPlaced(order: OrderSummary): Promise<void>;
}
