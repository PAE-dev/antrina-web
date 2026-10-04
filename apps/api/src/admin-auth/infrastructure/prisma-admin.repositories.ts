import { Inject, Injectable } from '@nestjs/common';
import {
  type AdminSession,
  type AdminSessionStore,
  AdminUser,
  type AdminUserRepository,
  type AuditEntry,
  type AuditLog,
  type NewAdminSession,
  type NewAdminUser,
} from '@antrina/domain';
import { type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';

type AdminUserRecord = Prisma.AdminUserGetPayload<object>;
type AdminSessionRecord = Prisma.AdminSessionGetPayload<object>;

function toDomainUser(record: AdminUserRecord): AdminUser {
  return AdminUser.create({
    id: record.id,
    email: record.email,
    name: record.name,
    passwordHash: record.passwordHash,
    role: record.role,
    totpSecretEnc: record.totpSecretEnc,
    totpEnabledAt: record.totpEnabledAt,
    failedLogins: record.failedLogins,
    lockedUntil: record.lockedUntil,
    isActive: record.isActive,
    lastLoginAt: record.lastLoginAt,
  });
}

function toDomainSession(record: AdminSessionRecord): AdminSession {
  return {
    id: record.id,
    adminUserId: record.adminUserId,
    mfaVerified: record.mfaVerified,
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt,
  };
}

@Injectable()
export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({ where: { email } });
    return record ? toDomainUser(record) : null;
  }

  async findById(id: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({ where: { id } });
    return record ? toDomainUser(record) : null;
  }

  async create(input: NewAdminUser): Promise<AdminUser> {
    return toDomainUser(await this.prisma.adminUser.create({ data: input }));
  }

  async save(user: AdminUser): Promise<void> {
    const { id, ...props } = user.toProps();
    await this.prisma.adminUser.update({ where: { id }, data: props });
  }
}

@Injectable()
export class PrismaAdminSessionStore implements AdminSessionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: NewAdminSession): Promise<AdminSession> {
    return toDomainSession(await this.prisma.adminSession.create({ data: input }));
  }

  async findByTokenHash(tokenHash: string): Promise<AdminSession | null> {
    const record = await this.prisma.adminSession.findUnique({ where: { tokenHash } });
    return record ? toDomainSession(record) : null;
  }

  async markMfaVerified(id: string, expiresAt: Date, now: Date): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id },
      data: { mfaVerified: true, expiresAt, lastSeenAt: now },
    });
  }

  async touch(id: string, now: Date): Promise<void> {
    await this.prisma.adminSession.updateMany({ where: { id }, data: { lastSeenAt: now } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adminSession.deleteMany({ where: { id } });
  }
}

@Injectable()
export class PrismaAuditLog implements AuditLog {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ...(entry.changes ? { changes: entry.changes as Prisma.InputJsonValue } : {}),
      },
    });
  }
}
