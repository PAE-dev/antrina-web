import {
  type CustomerDto,
  type MoneyDto,
  type OrderDto,
  type UpsertCustomerRequest,
} from '@antrina/contracts';
import {
  type Currency,
  type CustomerDraft,
  type CustomerWithStats,
  DEFAULT_CURRENCY,
  DomainError,
  normalizePhone,
  type Order,
  validateCustomerDraft,
} from '@antrina/domain';
import { optionalString, requireString } from '../shared/input.js';

const money = (amount: number, currency: Currency): MoneyDto => ({ amount, currency });

export function toOrderDto(order: Order): OrderDto {
  const { currency } = order;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    customer: order.customer
      ? { id: order.customer.id, name: order.customer.name, phone: order.customer.phone }
      : null,
    lines: order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPrice: money(line.unitPriceCents, currency),
      lineTotal: money(line.unitPriceCents * line.quantity, currency),
    })),
    unitCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: money(order.subtotalCents, currency),
    shipping: money(order.shippingCents, currency),
    discount: money(order.discountCents, currency),
    total: money(order.totalCents, currency),
    note: order.note,
    soldAt: order.soldAt.toISOString(),
    createdByName: order.createdByName,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toCustomerDto(customer: CustomerWithStats): CustomerDto {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    note: customer.note,
    orderCount: customer.orderCount,
    totalSpent: money(customer.totalSpentCents, DEFAULT_CURRENCY),
    lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  };
}

export function toCustomerDraft(input: UpsertCustomerRequest): CustomerDraft {
  if (typeof input !== 'object' || input === null) {
    throw new DomainError('Faltan los datos del cliente', 'input.invalid');
  }
  const phone = optionalString(input.phone, 'phone', 40)?.trim();
  return validateCustomerDraft({
    name: requireString(input.name, 'name', 200).trim(),
    phone: phone ? normalizePhone(phone) : null,
    email: optionalString(input.email, 'email', 200)?.trim().toLowerCase() || null,
    note: optionalString(input.note, 'note')?.trim() || null,
  });
}
