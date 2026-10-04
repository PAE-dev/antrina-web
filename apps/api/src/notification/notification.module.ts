import { Module } from '@nestjs/common';
import { WhatsAppOrderNotifier } from './infrastructure/whatsapp-order.notifier.js';
import { ORDER_NOTIFIER } from './notification.tokens.js';

@Module({
  providers: [{ provide: ORDER_NOTIFIER, useClass: WhatsAppOrderNotifier }],
  exports: [ORDER_NOTIFIER],
})
export class NotificationModule {}
