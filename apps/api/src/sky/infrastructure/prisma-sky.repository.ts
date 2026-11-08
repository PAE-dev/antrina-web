import { Inject, Injectable } from '@nestjs/common';
import {
  SKY_FORTUNE_LEVELS,
  SKY_TOPICS,
  type SkyDay,
  type SkyDayPatch,
  type SkyFortuneLevel,
  type SkyBond,
  type SkyProfile,
  type SkyProfileInput,
  type SkyQuestion,
  type SkyRepository,
  type SkyTopic,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

type ProfileRecord = Prisma.SkyProfileGetPayload<object>;
type QuestionRecord = Prisma.SkyQuestionGetPayload<object>;

type DayRecord = Prisma.SkyDayGetPayload<object>;

function toDay(record: DayRecord): SkyDay {
  const level = (SKY_FORTUNE_LEVELS as readonly string[]).includes(record.fortuneLevel ?? '')
    ? (record.fortuneLevel as SkyFortuneLevel)
    : null;
  return {
    day: record.day,
    rankingSeen: record.rankingSeen,
    ritualDone: record.ritualDone,
    fortune:
      level && record.fortuneVerse !== null && record.fortuneStone
        ? { level, verseIndex: record.fortuneVerse, stoneId: record.fortuneStone }
        : null,
  };
}

const BOND_FIELDS = { id: true, name: true, birthDate: true, createdAt: true } as const;

function toProfile(record: ProfileRecord): SkyProfile {
  const hasPlace =
    record.placeName !== null &&
    record.placeLat !== null &&
    record.placeLon !== null &&
    record.placeTimezone !== null;
  return {
    customerId: record.customerId,
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

  async getProfile(customerId: string): Promise<SkyProfile | null> {
    const record = await this.prisma.skyProfile.findUnique({ where: { customerId } });
    return record ? toProfile(record) : null;
  }

  async saveProfile(customerId: string, input: SkyProfileInput): Promise<SkyProfile> {
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
      where: { customerId },
      create: { customerId, ...data },
      update: data,
    });
    return toProfile(record);
  }

  async listDays(customerId: string, limit: number): Promise<SkyDay[]> {
    const records = await this.prisma.skyDay.findMany({
      where: { customerId },
      orderBy: { day: 'desc' },
      take: limit,
    });
    return records.map(toDay);
  }

  async markDay(customerId: string, day: string, patch: SkyDayPatch): Promise<SkyDay> {
    const existing = await this.prisma.skyDay.findUnique({
      where: { customerId_day: { customerId, day } },
    });
    const fortune =
      patch.fortune && !existing?.fortuneLevel
        ? {
            fortuneLevel: patch.fortune.level,
            fortuneVerse: patch.fortune.verseIndex,
            fortuneStone: patch.fortune.stoneId,
          }
        : {};
    const flags = {
      ...(patch.rankingSeen ? { rankingSeen: true } : {}),
      ...(patch.ritualDone ? { ritualDone: true } : {}),
    };
    const record = await this.prisma.skyDay.upsert({
      where: { customerId_day: { customerId, day } },
      create: { customerId, day, ...flags, ...fortune },
      update: { ...flags, ...fortune },
    });
    return toDay(record);
  }

  async deleteAll(customerId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.skyDay.deleteMany({ where: { customerId } }),
      this.prisma.skyProfile.deleteMany({ where: { customerId } }),
      this.prisma.skyQuestion.deleteMany({ where: { customerId } }),
      this.prisma.skyBond.deleteMany({ where: { customerId } }),
    ]);
  }

  async listQuestions(customerId: string, limit: number): Promise<SkyQuestion[]> {
    const records = await this.prisma.skyQuestion.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map(toQuestion);
  }

  async addQuestion(
    customerId: string,
    input: { question: string; topic: SkyTopic; day: string },
    keep: number,
  ): Promise<SkyQuestion> {
    return this.prisma.$transaction(async (tx) => {
      await tx.skyQuestion.deleteMany({ where: { customerId, question: input.question } });
      const created = await tx.skyQuestion.create({ data: { customerId, ...input } });
      const stale = await tx.skyQuestion.findMany({
        where: { customerId },
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

  async listBonds(customerId: string): Promise<SkyBond[]> {
    return this.prisma.skyBond.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: BOND_FIELDS,
    });
  }

  async countBonds(customerId: string): Promise<number> {
    return this.prisma.skyBond.count({ where: { customerId } });
  }

  async addBond(customerId: string, input: { name: string; birthDate: string }): Promise<SkyBond> {
    return this.prisma.skyBond.create({ data: { customerId, ...input }, select: BOND_FIELDS });
  }

  async deleteBond(customerId: string, bondId: string): Promise<boolean> {
    const result = await this.prisma.skyBond.deleteMany({ where: { id: bondId, customerId } });
    return result.count > 0;
  }
}
