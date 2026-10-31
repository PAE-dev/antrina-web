import { type CreateOrderRequest } from '@antrina/contracts';
import {
  normalizePhone,
  type Order,
  type OrderDraft,
  type OrderRepository,
  orderTotals,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CancelOrderUseCase,
  CreateOrderUseCase,
  limaPeriods,
  UpdateOrderStatusUseCase,
} from '../src/index.js';
import { FakeClock, MemoryAudit } from './fakes.js';

class InMemoryOrders implements Pick<
  OrderRepository,
  'create' | 'findById' | 'updateStatus' | 'cancel'
> {
  readonly orders = new Map<string, Order>();
  drafts: OrderDraft[] = [];

  async create(draft: OrderDraft) {
    this.drafts.push(draft);
    const order: Order = {
      id: `order-${this.orders.size + 1}`,
      number: this.orders.size + 1,
      status: draft.status,
      channel: draft.channel,
      paymentMethod: draft.paymentMethod,
      customer: null,
      currency: draft.currency,
      lines: draft.lines.map((line, index) => ({
        id: `line-${index}`,
        sku: 'SKU',
        name: 'Producto',
        ...line,
      })),
      ...orderTotals(draft),
      shippingCents: draft.shippingCents,
      discountCents: draft.discountCents,
      note: draft.note,
      soldAt: draft.soldAt,
      createdByName: null,
      createdAt: draft.soldAt,
    };
    this.orders.set(order.id, order);
    return order;
  }
  async findById(id: string) {
    return this.orders.get(id) ?? null;
  }
  async updateStatus(id: string, status: Order['status']) {
    const order = { ...this.orders.get(id)!, status };
    this.orders.set(id, order);
    return order;
  }
  async cancel(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }
}

const request: CreateOrderRequest = {
  status: 'PAID',
  channel: 'WHATSAPP',
  paymentMethod: 'YAPE',
  customerId: null,
  customer: { name: ' Ana Pérez ', phone: '987 654 321', email: null, note: null },
  currency: 'PEN',
  lines: [
    { productId: 'p1', quantity: 2, unitPriceCents: 10000 },
    { productId: 'p2', quantity: 1, unitPriceCents: 5000 },
  ],
  shippingCents: 1500,
  discountCents: 500,
  note: null,
  soldAt: null,
};

describe('ventas del panel', () => {
  let orders: InMemoryOrders;
  let audit: MemoryAudit;
  let clock: FakeClock;
  let create: CreateOrderUseCase;

  beforeEach(() => {
    orders = new InMemoryOrders();
    audit = new MemoryAudit();
    clock = new FakeClock();
    create = new CreateOrderUseCase(orders as unknown as OrderRepository, audit, clock);
  });

  it('calcula los totales y registra la auditoría', async () => {
    const order = await create.execute(request, 'admin-1');
    expect(order.subtotal.amount).toBe(25000);
    expect(order.total.amount).toBe(26000);
    expect(order.unitCount).toBe(3);
    expect(audit.entries.map((entry) => entry.action)).toEqual(['order.created']);
  });

  it('normaliza el cliente nuevo y da prioridad al cliente existente', async () => {
    await create.execute(request, 'admin-1');
    expect(orders.drafts[0]?.customer).toMatchObject({ name: 'Ana Pérez', phone: '+51987654321' });

    await create.execute({ ...request, customerId: 'cust-1' }, 'admin-1');
    expect(orders.drafts[1]?.customerId).toBe('cust-1');
    expect(orders.drafts[1]?.customer).toBeNull();
  });

  it('rechaza ventas vacías, repetidas o con importes imposibles', async () => {
    const cases: [Partial<CreateOrderRequest>, string][] = [
      [{ lines: [] }, 'order.invalid_lines'],
      [
        {
          lines: [
            { productId: 'p1', quantity: 1, unitPriceCents: 1 },
            { productId: 'p1', quantity: 1, unitPriceCents: 1 },
          ],
        },
        'order.invalid_lines',
      ],
      [{ lines: [{ productId: 'p1', quantity: 0, unitPriceCents: 1 }] }, 'order.invalid_quantity'],
      [{ discountCents: 9_999_999 }, 'order.invalid_discount'],
      [{ soldAt: '2030-01-01T00:00:00Z' }, 'order.invalid_sold_at'],
      [{ soldAt: 'ayer' }, 'order.invalid_sold_at'],
    ];
    for (const [patch, code] of cases) {
      await expect(create.execute({ ...request, ...patch }, 'admin-1')).rejects.toMatchObject({
        code,
      });
    }
    expect(orders.drafts).toHaveLength(0);
  });

  it('no permite crear una venta ya cancelada', async () => {
    await expect(
      create.execute({ ...request, status: 'CANCELLED' as never }, 'admin-1'),
    ).rejects.toMatchObject({ code: 'input.invalid' });
  });

  it('una venta cancelada no se puede reabrir ni cancelar otra vez', async () => {
    const repo = orders as unknown as OrderRepository;
    const { id } = await create.execute(request, 'admin-1');
    const cancel = new CancelOrderUseCase(repo, audit);
    const update = new UpdateOrderStatusUseCase(repo, audit);

    await expect(update.execute(id, 'SHIPPED', 'admin-1')).resolves.toMatchObject({
      status: 'SHIPPED',
    });
    await expect(update.execute(id, 'SHIPPED', 'admin-1')).rejects.toMatchObject({
      code: 'order.same_status',
    });
    await expect(cancel.execute(id, 'admin-1')).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(update.execute(id, 'PAID', 'admin-1')).rejects.toMatchObject({
      code: 'order.cancelled',
    });
    await expect(cancel.execute(id, 'admin-1')).rejects.toMatchObject({
      code: 'order.cancelled',
    });
  });
});

describe('teléfonos para WhatsApp', () => {
  it('asume Perú en celulares de 9 dígitos y respeta el código de país', () => {
    expect(normalizePhone('987654321')).toBe('+51987654321');
    expect(normalizePhone('987 654 321')).toBe('+51987654321');
    expect(normalizePhone('+51 987-654-321')).toBe('+51987654321');
    expect(normalizePhone('+34 612 345 678')).toBe('+34612345678');
    expect(normalizePhone('0034612345678')).toBe('+34612345678');
  });

  it('rechaza lo que no es un teléfono', () => {
    for (const value of ['abc', '123', '']) {
      expect(() => normalizePhone(value)).toThrow(
        expect.objectContaining({ code: 'customer.invalid_phone' }),
      );
    }
  });
});

describe('periodos del resumen en hora de Lima', () => {
  it('a las 23:30 en Lima sigue siendo el mismo día aunque en UTC ya sea mañana', () => {
    const periods = limaPeriods(new Date('2026-11-01T04:30:00Z')); // 31 oct, 23:30 en Lima
    expect(periods.today.toISOString()).toBe('2026-10-31T05:00:00.000Z');
    expect(periods.month.toISOString()).toBe('2026-10-01T05:00:00.000Z');
    expect(periods.previousMonth.toISOString()).toBe('2026-09-01T05:00:00.000Z');
    expect(periods.chartDays).toHaveLength(30);
    expect(periods.chartDays.at(-1)).toBe('2026-10-31');
    expect(periods.chartDays[0]).toBe('2026-10-02');
  });

  it('enero mira a diciembre del año anterior', () => {
    const periods = limaPeriods(new Date('2027-01-15T12:00:00Z'));
    expect(periods.previousMonth.toISOString()).toBe('2026-12-01T05:00:00.000Z');
  });
});
