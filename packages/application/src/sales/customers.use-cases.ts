import {
  type CustomerDto,
  type CustomerListQuery,
  type CustomerListResponse,
  type UpsertCustomerRequest,
} from '@antrina/contracts';
import { type AuditLog, type CustomerRepository } from '@antrina/domain';
import { notFound } from '../shared/input.js';
import { parsePaging } from '../shared/paging.js';
import { toCustomerDraft, toCustomerDto } from './sales.mappers.js';

const customerNotFound = () => notFound('Cliente', 'customer.not_found');

export class ListCustomersUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(query: CustomerListQuery): Promise<CustomerListResponse> {
    const { page, pageSize, limit, offset } = parsePaging(query);
    const q = query.q?.trim().slice(0, 100);
    const result = await this.customers.list({
      ...(q ? { query: q } : {}),
      ...(query.withPhone ? { withPhone: true } : {}),
      limit,
      offset,
    });
    return { data: result.items.map(toCustomerDto), total: result.total, page, pageSize };
  }
}

export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(id: string): Promise<CustomerDto> {
    const customer = await this.customers.findById(id);
    if (!customer) throw customerNotFound();
    return toCustomerDto(customer);
  }
}

export class CreateCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: UpsertCustomerRequest, actorId: string): Promise<CustomerDto> {
    const customer = await this.customers.create(toCustomerDraft(input));
    await this.audit.record({
      adminUserId: actorId,
      action: 'customer.created',
      entityType: 'Customer',
      entityId: customer.id,
    });
    return toCustomerDto(customer);
  }
}

export class UpdateCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, input: UpsertCustomerRequest, actorId: string): Promise<CustomerDto> {
    if (!(await this.customers.findById(id))) throw customerNotFound();
    const customer = await this.customers.update(id, toCustomerDraft(input));
    await this.audit.record({
      adminUserId: actorId,
      action: 'customer.updated',
      entityType: 'Customer',
      entityId: id,
    });
    return toCustomerDto(customer);
  }
}
