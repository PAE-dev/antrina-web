import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './checkout.tokens.js';
import { UnconfiguredPaymentGateway } from './infrastructure/unconfigured-payment.gateway.js';

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: UnconfiguredPaymentGateway }],
  exports: [PAYMENT_GATEWAY],
})
export class CheckoutModule {}
