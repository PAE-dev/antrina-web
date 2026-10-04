import { type Money, type OrderSummary } from '@antrina/domain';

const COPY = {
  es: {
    greeting: 'Hola',
    received: 'recibimos tu pedido',
    total: 'Total',
    thanks: '¡Gracias por apoyar el trabajo artesanal!',
  },
  en: {
    greeting: 'Hi',
    received: 'we received your order',
    total: 'Total',
    thanks: 'Thank you for supporting artisan work!',
  },
} as const;

function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-PE' : 'en-US', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountInCents / 100);
}

export function buildOrderMessage(order: OrderSummary): string {
  const copy = COPY[order.locale];
  const lines = order.lines.map(
    (line) => `• ${line.quantity} × ${line.name} — ${formatMoney(line.unitPrice, order.locale)}`,
  );
  return [
    `${copy.greeting} ${order.customer.fullName}, ${copy.received} #${order.id}.`,
    ...lines,
    `${copy.total}: ${formatMoney(order.total, order.locale)}`,
    copy.thanks,
  ].join('\n');
}
