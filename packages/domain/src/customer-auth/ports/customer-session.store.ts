import { type CustomerSession } from '../customer-account.js';

export interface NewCustomerSession {
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
}

export interface CustomerSessionStore {
  create(input: NewCustomerSession): Promise<CustomerSession>;
  findByTokenHash(tokenHash: string): Promise<CustomerSession | null>;
  delete(id: string): Promise<void>;
  deleteExpired(now: Date): Promise<void>;
}
