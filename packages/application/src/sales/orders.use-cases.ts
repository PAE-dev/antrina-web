import {
  type CreateOrderRequest,
  type OrderDto,
  type OrderListQuery,
  type OrderListResponse,
} from '@antrina/contracts';
import {
  assertCanChangeStatus,
  type AuditLog,
  type Clock,
  DomainError,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  type OrderDraft,
  type OrderLineDraft,
  type OrderRepository,
  type OrderStatus,
  PAYMENT_METHODS,
  SUPPORTED_CURRENCIES,
  validateOrderDraft,
} from '@antrina/domain';
import {
  notFound,
  optionalString,
  requireInteger,
  requireOneOf,
  requireString,
} from '../shared/input.js';
import { parsePaging } from '../shared/paging.js';
import { toCustomerDraft, toOrderDto } from './sales.mappers.js';

const OPEN_STATUSES = ORDER_STATUSES.filter(
  (status): status is Exclude<OrderStatus, 'CANCELLED'> => status !== 'CANCELLED',
);

const orderNotFound = () => notFound('Venta', 'order.not_found');

function parseLines(value: unknown): OrderLineDraft[] {
  if (!Array.isArray(value))
    throw new DomainError('Añade al menos un producto', 'order.invalid_lines');
  return value.map((line: Record<string, unknown>) => ({
    productId: requireString(line?.productId, 'productId', 64),
    quantity: requireInteger(line?.quantity, 'quantity'),
    unitPriceCents: requireInteger(line?.unitPriceCents, 'unitPriceCents'),
  }));
}

function parseSoldAt(value: unknown, now: Date): Date {
  if (value === null || value === undefined || value === '') return now;
  const date = new Date(requireString(value, 'soldAt', 40));
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('Fecha de venta inválida', 'order.invalid_sold_at');
  }
  return date;
}

function toOrderDraft(input: CreateOrderRequest, now: Date): OrderDraft {
  if (typeof input !== 'object' || input === null) {
    throw new DomainError('Cuerpo de la petición inválido', 'input.invalid');
  }
  const customerId = optionalString(input.customerId, 'customerId', 64);
  return validateOrderDraft(
    {
      status: requireOneOf(input.status, OPEN_STATUSES, 'status'),
      channel: requireOneOf(input.channel, ORDER_CHANNELS, 'channel'),
      paymentMethod: input.paymentMethod
        ? requireOneOf(input.paymentMethod, PAYMENT_METHODS, 'paymentMethod')
        : null,
      customerId,
      customer: !customerId && input.customer ? toCustomerDraft(input.customer) : null,
      currency: requireOneOf(input.currency, SUPPORTED_CURRENCIES, 'currency'),
      lines: parseLines(input.lines),
      shippingCents: requireInteger(input.shippingCents ?? 0, 'shippingCents'),
      discountCents: requireInteger(input.discountCents ?? 0, 'discountCents'),
      note: optionalString(input.note, 'note')?.trim() || null,
      soldAt: parseSoldAt(input.soldAt, now),
    },
    now,
  );
}

/** Registra la venta: descuenta el stock y crea o reutiliza el cliente. */
export class CreateOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly audit: AuditLog,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateOrderRequest, actorId: string): Promise<OrderDto> {
    const order = await this.orders.create(toOrderDraft(input, this.clock.now()), actorId);
    await this.audit.record({
      adminUserId: actorId,
      action: 'order.created',
      entityType: 'Order',
      entityId: order.id,
      changes: { number: order.number, totalCents: order.totalCents, channel: order.channel },
    });
    return toOrderDto(order);
  }
}

export class ListOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(query: OrderListQuery): Promise<OrderListResponse> {
    const { page, pageSize, limit, offset } = parsePaging(query);
    const q = query.q?.trim().slice(0, 100);
    const result = await this.orders.list({
      ...(q ? { query: q } : {}),
      ...(query.status ? { status: requireOneOf(query.status, ORDER_STATUSES, 'status') } : {}),
      ...(query.channel ? { channel: requireOneOf(query.channel, ORDER_CHANNELS, 'channel') } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      limit,
      offset,
    });
    return { data: result.items.map(toOrderDto), total: result.total, page, pageSize };
  }
}

export class GetOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(id: string): Promise<OrderDto> {
    const order = await this.orders.findById(id);
    if (!order) throw orderNotFound();
    return toOrderDto(order);
  }
}

export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, status: unknown, actorId: string): Promise<OrderDto> {
    const next = requireOneOf(status, OPEN_STATUSES, 'status');
    const current = await this.orders.findById(id);
    if (!current) throw orderNotFound();
    assertCanChangeStatus(current.status, next);
    const order = await this.orders.updateStatus(id, next);
    await this.audit.record({
      adminUserId: actorId,
      action: 'order.status_changed',
      entityType: 'Order',
      entityId: id,
      changes: { status: { from: current.status, to: next } },
    });
    return toOrderDto(order);
  }
}

/** Cancela la venta y devuelve sus unidades al stock. */
export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, actorId: string): Promise<OrderDto> {
    const current = await this.orders.findById(id);
    if (!current) throw orderNotFound();
    assertCanChangeStatus(current.status, 'CANCELLED');
    const order = await this.orders.cancel(id, actorId);
    await this.audit.record({
      adminUserId: actorId,
      action: 'order.cancelled',
      entityType: 'Order',
      entityId: id,
      changes: { status: { from: current.status, to: 'CANCELLED' } },
    });
    return toOrderDto(order);
  }
}
