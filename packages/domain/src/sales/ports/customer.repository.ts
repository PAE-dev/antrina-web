import { type CustomerDraft, type CustomerWithStats } from '../customer.js';

export interface CustomerCriteria {
  query?: string;
  /** Solo clientes con teléfono (vista de WhatsApp). */
  withPhone?: boolean;
  /** Solo los registrados en la tienda, del más reciente al más antiguo. */
  webAccount?: boolean;
  limit: number;
  offset: number;
}

export interface CustomerPage {
  items: CustomerWithStats[];
  total: number;
}

/** Los adapters traducen el teléfono repetido a `customer.duplicate_phone`. */
export interface CustomerRepository {
  list(criteria: CustomerCriteria): Promise<CustomerPage>;
  findById(id: string): Promise<CustomerWithStats | null>;
  create(draft: CustomerDraft): Promise<CustomerWithStats>;
  update(id: string, draft: CustomerDraft): Promise<CustomerWithStats>;
}
