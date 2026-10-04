import { Injectable, Logger } from '@nestjs/common';
import { type OrderNotifier, type OrderSummary } from '@antrina/domain';
import { buildOrderMessage } from './order-message.js';

/**
 * Stub del adapter de WhatsApp. Por ahora solo registra el mensaje que se enviaría.
 * TODO(fase checkout): enviar vía WhatsApp Cloud API con una plantilla aprobada por Meta.
 */
@Injectable()
export class WhatsAppOrderNotifier implements OrderNotifier {
  readonly channel = 'whatsapp';
  private readonly logger = new Logger(WhatsAppOrderNotifier.name);

  async notifyOrderPlaced(order: OrderSummary): Promise<void> {
    this.logger.log(`[stub] WhatsApp a ${order.customer.phone}:\n${buildOrderMessage(order)}`);
  }
}
