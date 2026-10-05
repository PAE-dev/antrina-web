import { type ProductStatusCode } from '@antrina/contracts';
import { STATUS_LABELS } from '../lib/format';

const TONES: Record<ProductStatusCode, { badge: string; dot: string }> = {
  ACTIVE: { badge: 'bg-success-tint text-success', dot: 'bg-success' },
  DRAFT: { badge: 'bg-bg-alt text-text-secondary', dot: 'bg-text-muted' },
  ARCHIVED: { badge: 'bg-warning-tint text-warning', dot: 'bg-warning' },
};

export function StatusBadge({ status }: { status: ProductStatusCode }) {
  const tone = TONES[status];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${tone.badge}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
