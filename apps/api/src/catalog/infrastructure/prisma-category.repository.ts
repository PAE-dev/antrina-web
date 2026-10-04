import { Inject, Injectable } from '@nestjs/common';
import { type Category, type CategoryRepository } from '@antrina/domain';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { categoryInclude, toDomainCategory } from './prisma-catalog.mapper.js';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      include: categoryInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return records.map(toDomainCategory);
  }
}
