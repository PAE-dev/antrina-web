import { Inject, Injectable } from '@nestjs/common';
import {
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerSession,
  type CustomerSessionStore,
  type GoogleIdentity,
  type NewCustomerSession,
} from '@antrina/domain';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

function toAccount(record: { id: string; name: string; email: string | null }): CustomerAccount {
  return { id: record.id, name: record.name, email: record.email ?? '' };
}

function toSession(record: { id: string; customerId: string; expiresAt: Date }): CustomerSession {
  return { id: record.id, customerId: record.customerId, expiresAt: record.expiresAt };
}

@Injectable()
export class PrismaCustomerAccountRepository implements CustomerAccountRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerAccount | null> {
    const record = await this.prisma.customer.findFirst({
      where: { id, googleSubject: { not: null } },
    });
    return record ? toAccount(record) : null;
  }

  async findByGoogleSubject(subject: string): Promise<CustomerAccount | null> {
    const record = await this.prisma.customer.findUnique({ where: { googleSubject: subject } });
    return record ? toAccount(record) : null;
  }

  async createFromGoogle(identity: GoogleIdentity, now: Date): Promise<CustomerAccount> {
    return toAccount(
      await this.prisma.customer.create({
        data: {
          name: identity.name,
          email: identity.email,
          googleSubject: identity.subject,
          lastLoginAt: now,
        },
      }),
    );
  }

  async recordGoogleLogin(
    id: string,
    identity: GoogleIdentity,
    now: Date,
  ): Promise<CustomerAccount> {
    return toAccount(
      await this.prisma.customer.update({
        where: { id },
        data: { email: identity.email, lastLoginAt: now },
      }),
    );
  }
}

@Injectable()
export class PrismaCustomerSessionStore implements CustomerSessionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: NewCustomerSession): Promise<CustomerSession> {
    return toSession(await this.prisma.customerSession.create({ data: input }));
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerSession | null> {
    const record = await this.prisma.customerSession.findUnique({ where: { tokenHash } });
    return record ? toSession(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customerSession.deleteMany({ where: { id } });
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.prisma.customerSession.deleteMany({ where: { expiresAt: { lte: now } } });
  }
}
