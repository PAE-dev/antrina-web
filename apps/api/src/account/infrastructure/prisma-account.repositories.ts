import { Inject, Injectable } from '@nestjs/common';
import {
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerSession,
  type CustomerSessionStore,
  type NewCustomerAccount,
  type NewCustomerSession,
  SKY_TOPICS,
  type SkyBond,
  type SkyProfile,
  type SkyProfileInput,
  type SkyQuestion,
  type SkyRepository,
  type SkyTopic,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

type AccountRecord = Prisma.CustomerAccountGetPayload<object>;
type ProfileRecord = Prisma.SkyProfileGetPayload<object>;
type QuestionRecord = Prisma.SkyQuestionGetPayload<object>;

function toAccount(record: AccountRecord): CustomerAccount {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    avatarUrl: record.avatarUrl,
    googleSub: record.googleSub,
    customerId: record.customerId,
    createdAt: record.createdAt,
    lastLoginAt: record.lastLoginAt,
  };
}

@Injectable()
export class PrismaCustomerAccountRepository implements CustomerAccountRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerAccount | null> {
    const record = await this.prisma.customerAccount.findUnique({ where: { id } });
    return record ? toAccount(record) : null;
  }

  async findByGoogleSub(sub: string): Promise<CustomerAccount | null> {
    const record = await this.prisma.customerAccount.findUnique({ where: { googleSub: sub } });
    return record ? toAccount(record) : null;
  }

  async findByEmail(email: string): Promise<CustomerAccount | null> {
    const record = await this.prisma.customerAccount.findUnique({ where: { email } });
    return record ? toAccount(record) : null;
  }

  async create(input: NewCustomerAccount): Promise<CustomerAccount> {
    const record = await this.prisma.customerAccount.create({
      data: { ...input, lastLoginAt: new Date() },
    });
    return toAccount(record);
  }

  async updateProfile(
    id: string,
    input: { email: string; name: string; avatarUrl: string | null; googleSub: string },
    now: Date,
  ): Promise<CustomerAccount> {
    const record = await this.prisma.customerAccount.update({
      where: { id },
      data: { ...input, lastLoginAt: now },
    });
    return toAccount(record);
  }

  async linkCustomer(id: string, customerId: string): Promise<void> {
    await this.prisma.customerAccount.update({ where: { id }, data: { customerId } });
  }

  async findLinkableCustomerId(email: string): Promise<string | null> {
    const matches = await this.prisma.customer.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, account: { select: { id: true } } },
      take: 2,
    });
    if (matches.length !== 1 || matches[0]!.account) return null;
    return matches[0]!.id;
  }
}

@Injectable()
export class PrismaCustomerSessionStore implements CustomerSessionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: NewCustomerSession): Promise<CustomerSession> {
    const record = await this.prisma.customerSession.create({ data: input });
    return record;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomerSession | null> {
    return this.prisma.customerSession.findUnique({
      where: { tokenHash },
      select: { id: true, accountId: true, expiresAt: true, lastSeenAt: true },
    });
  }

  async touch(id: string, now: Date, expiresAt?: Date): Promise<void> {
    await this.prisma.customerSession.update({
      where: { id },
      data: { lastSeenAt: now, ...(expiresAt ? { expiresAt } : {}) },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customerSession.deleteMany({ where: { id } });
  }
}

function toProfile(record: ProfileRecord): SkyProfile {
  const hasPlace =
    record.placeName !== null &&
    record.placeLat !== null &&
    record.placeLon !== null &&
    record.placeTimezone !== null;
  return {
    accountId: record.accountId,
    birthDate: record.birthDate,
    birthTime: record.birthTime,
    place: hasPlace
      ? {
          name: record.placeName!,
          region: record.placeRegion ?? '',
          country: record.placeCountry ?? '',
          lat: record.placeLat!,
          lon: record.placeLon!,
          timezone: record.placeTimezone!,
        }
      : null,
    updatedAt: record.updatedAt,
  };
}

function toQuestion(record: QuestionRecord): SkyQuestion {
  const topic = (SKY_TOPICS as readonly string[]).includes(record.topic)
    ? (record.topic as SkyTopic)
    : 'self';
  return {
    id: record.id,
    question: record.question,
    topic,
    day: record.day,
    createdAt: record.createdAt,
  };
}

@Injectable()
export class PrismaSkyRepository implements SkyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(accountId: string): Promise<SkyProfile | null> {
    const record = await this.prisma.skyProfile.findUnique({ where: { accountId } });
    return record ? toProfile(record) : null;
  }

  async saveProfile(accountId: string, input: SkyProfileInput): Promise<SkyProfile> {
    const data = {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      placeName: input.place?.name ?? null,
      placeRegion: input.place?.region ?? null,
      placeCountry: input.place?.country ?? null,
      placeLat: input.place?.lat ?? null,
      placeLon: input.place?.lon ?? null,
      placeTimezone: input.place?.timezone ?? null,
    };
    const record = await this.prisma.skyProfile.upsert({
      where: { accountId },
      create: { accountId, ...data },
      update: data,
    });
    return toProfile(record);
  }

  async deleteAll(accountId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.skyProfile.deleteMany({ where: { accountId } }),
      this.prisma.skyQuestion.deleteMany({ where: { accountId } }),
      this.prisma.skyBond.deleteMany({ where: { accountId } }),
    ]);
  }

  async listQuestions(accountId: string, limit: number): Promise<SkyQuestion[]> {
    const records = await this.prisma.skyQuestion.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map(toQuestion);
  }

  async addQuestion(
    accountId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ): Promise<SkyQuestion> {
    return this.prisma.$transaction(async (tx) => {
      await tx.skyQuestion.deleteMany({ where: { accountId, question: input.question } });
      const created = await tx.skyQuestion.create({ data: { accountId, ...input } });
      const stale = await tx.skyQuestion.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip: keep,
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.skyQuestion.deleteMany({ where: { id: { in: stale.map((q) => q.id) } } });
      }
      return toQuestion(created);
    });
  }

  async listBonds(accountId: string): Promise<SkyBond[]> {
    return this.prisma.skyBond.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, birthDate: true, createdAt: true },
    });
  }

  async countBonds(accountId: string): Promise<number> {
    return this.prisma.skyBond.count({ where: { accountId } });
  }

  async addBond(accountId: string, input: { name: string; birthDate: string }): Promise<SkyBond> {
    return this.prisma.skyBond.create({
      data: { accountId, ...input },
      select: { id: true, name: true, birthDate: true, createdAt: true },
    });
  }

  async deleteBond(accountId: string, bondId: string): Promise<boolean> {
    const result = await this.prisma.skyBond.deleteMany({ where: { id: bondId, accountId } });
    return result.count > 0;
  }
}
