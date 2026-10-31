import { type OrderStatusCode } from '@antrina/contracts';
import { ORDER_STATUS_LABELS } from '../lib/format';

const TONES: Record<OrderStatusCode, { badge: string; dot: string }> = {
  PENDING: { badge: 'bg-warning-tint text-warning', dot: 'bg-warning' },
  PAID: { badge: 'bg-success-tint text-success', dot: 'bg-success' },
  SHIPPED: { badge: 'bg-brand-tint text-brand', dot: 'bg-brand' },
  DELIVERED: { badge: 'bg-bg-alt text-text-secondary', dot: 'bg-text-muted' },
  CANCELLED: { badge: 'bg-danger-tint text-danger', dot: 'bg-danger' },
};

export function OrderStatusBadge({ status }: { status: OrderStatusCode }) {
  const tone = TONES[status];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${tone.badge}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
