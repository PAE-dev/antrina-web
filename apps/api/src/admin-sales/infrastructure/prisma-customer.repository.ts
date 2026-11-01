import { Inject, Injectable } from '@nestjs/common';
import {
  type CustomerCriteria,
  type CustomerDraft,
  type CustomerPage,
  type CustomerRepository,
  type CustomerWithStats,
  DEFAULT_CURRENCY,
  DomainError,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

/** Las estadísticas no cuentan ventas canceladas ni en otra moneda. */
const customerInclude = {
  orders: {
    where: { status: { not: 'CANCELLED' }, currency: DEFAULT_CURRENCY },
    select: { totalCents: true, soldAt: true },
  },
} satisfies Prisma.CustomerInclude;

type CustomerRecord = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

function toCustomerWithStats(record: CustomerRecord): CustomerWithStats {
  const lastOrderAt = record.orders.reduce<Date | null>(
    (latest, order) => (latest && latest > order.soldAt ? latest : order.soldAt),
    null,
  );
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    email: record.email,
    note: record.note,
    hasWebAccount: record.googleSubject !== null,
    lastLoginAt: record.lastLoginAt,
    createdAt: record.createdAt,
    orderCount: record.orders.length,
    totalSpentCents: record.orders.reduce((sum, order) => sum + order.totalCents, 0),
    lastOrderAt,
  };
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new DomainError('Ya hay un cliente con ese teléfono', 'customer.duplicate_phone');
    }
    if (error.code === 'P2025') {
      throw new DomainError('Cliente no encontrado', 'customer.not_found');
    }
  }
  throw error;
}

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(criteria: CustomerCriteria): Promise<CustomerPage> {
    const where: Prisma.CustomerWhereInput = {
      ...(criteria.withPhone ? { phone: { not: null } } : {}),
      ...(criteria.webAccount ? { googleSubject: { not: null } } : {}),
      ...(criteria.query
        ? {
            OR: [
              { name: { contains: criteria.query, mode: 'insensitive' } },
              { phone: { contains: criteria.query } },
              { email: { contains: criteria.query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: customerInclude,
        orderBy: criteria.webAccount ? { createdAt: 'desc' } : { updatedAt: 'desc' },
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: records.map(toCustomerWithStats), total };
  }

  async findById(id: string): Promise<CustomerWithStats | null> {
    const record = await this.prisma.customer.findUnique({
      where: { id },
      include: customerInclude,
    });
    return record ? toCustomerWithStats(record) : null;
  }

  async create(draft: CustomerDraft): Promise<CustomerWithStats> {
    try {
      const record = await this.prisma.customer.create({
        data: draft,
        include: customerInclude,
      });
      return toCustomerWithStats(record);
    } catch (error) {
      translateWriteError(error);
    }
  }

  async update(id: string, draft: CustomerDraft): Promise<CustomerWithStats> {
    try {
      const record = await this.prisma.customer.update({
        where: { id },
        data: draft,
        include: customerInclude,
      });
      return toCustomerWithStats(record);
    } catch (error) {
      translateWriteError(error);
    }
  }
}
