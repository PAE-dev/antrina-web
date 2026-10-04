import { Injectable, Logger } from '@nestjs/common';
import { type ChargeRequest, type ChargeResult, type PaymentGateway } from '@antrina/domain';

/**
 * Placeholder hasta integrar una pasarela peruana (Culqi, Niubiz, Izipay o Yape).
 * Rechaza todos los cobros para que nunca se confirme un pedido sin pago real.
 */
@Injectable()
export class UnconfiguredPaymentGateway implements PaymentGateway {
  readonly provider = 'unconfigured';
  private readonly logger = new Logger(UnconfiguredPaymentGateway.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.warn(
      `Cobro rechazado para el pedido ${request.orderId}: no hay pasarela configurada`,
    );
    return { status: 'failed', reason: 'payment_gateway_not_configured' };
  }
}
