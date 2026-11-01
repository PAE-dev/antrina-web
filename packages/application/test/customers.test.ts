import {
  type CustomerCriteria,
  type CustomerPage,
  type CustomerRepository,
  type CustomerWithStats,
} from '@antrina/domain';
import { describe, expect, it } from 'vitest';
import { GetCustomerUseCase, ListCustomersUseCase } from '../src/index.js';

const REGISTERED_AT = new Date('2026-10-31T15:00:00Z');
const LAST_LOGIN_AT = new Date('2026-11-01T02:30:00Z');

const webCustomer: CustomerWithStats = {
  id: 'web-1',
  name: 'Ana',
  phone: null,
  email: 'ana@example.com',
  note: null,
  hasWebAccount: true,
  lastLoginAt: LAST_LOGIN_AT,
  createdAt: REGISTERED_AT,
  orderCount: 0,
  totalSpentCents: 0,
  lastOrderAt: null,
};

const panelCustomer: CustomerWithStats = {
  ...webCustomer,
  id: 'panel-1',
  name: 'Luis',
  phone: '+51987654321',
  email: null,
  hasWebAccount: false,
  lastLoginAt: null,
};

class InMemoryCustomers implements Pick<CustomerRepository, 'list' | 'findById'> {
  readonly items = [panelCustomer, webCustomer];

  async list(criteria: CustomerCriteria): Promise<CustomerPage> {
    const items = this.items.filter((item) => !criteria.webAccount || item.hasWebAccount);
    return { items, total: items.length };
  }

  async findById(id: string): Promise<CustomerWithStats | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
}

const repository = new InMemoryCustomers() as unknown as CustomerRepository;

describe('clientes del panel', () => {
  it('filtra los registrados en la web', async () => {
    const list = new ListCustomersUseCase(repository);

    const all = await list.execute({});
    const onlyWeb = await list.execute({ webAccount: true });

    expect(all.total).toBe(2);
    expect(onlyWeb.data.map((customer) => customer.id)).toEqual(['web-1']);
  });

  it('muestra la fecha de registro y el último acceso de quien tiene cuenta', async () => {
    const customer = await new GetCustomerUseCase(repository).execute('web-1');

    expect(customer).toMatchObject({
      hasWebAccount: true,
      createdAt: REGISTERED_AT.toISOString(),
      lastLoginAt: LAST_LOGIN_AT.toISOString(),
    });
  });

  it('distingue a quien solo existe en el panel', async () => {
    const customer = await new GetCustomerUseCase(repository).execute('panel-1');

    expect(customer).toMatchObject({ hasWebAccount: false, lastLoginAt: null });
  });
});
