import { Inject, Injectable } from '@nestjs/common';
import {
  type Category,
  type CategoryDraft,
  type CategoryRepository,
  type CategoryWithCounts,
  DomainError,
} from '@antrina/domain';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { categoryInclude, toDomainCategory } from './prisma-catalog.mapper.js';

function translationRows(draft: CategoryDraft) {
  return Object.entries(draft.content).flatMap(([locale, content]) =>
    content
      ? [{ locale, name: content.name, slug: content.slug, description: content.description }]
      : [],
  );
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new DomainError('Ya existe una categoría con esa URL', 'category.duplicate_slug');
    }
    if (error.code === 'P2003') {
      throw new DomainError('La categoría superior no existe', 'category.invalid_parent');
    }
    if (error.code === 'P2025') {
      throw new DomainError('Categoría no encontrada', 'category.not_found');
    }
  }
  throw error;
}

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

  async findById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
    return record ? toDomainCategory(record) : null;
  }

  async findAllWithCounts(): Promise<CategoryWithCounts[]> {
    const [records, active] = await Promise.all([
      this.prisma.category.findMany({
        include: { ...categoryInclude, _count: { select: { products: true, children: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
    ]);
    const activeByCategory = new Map(active.map((row) => [row.categoryId, row._count._all]));
    return records.map((record) => ({
      category: toDomainCategory(record),
      productCount: record._count.products,
      activeProductCount: activeByCategory.get(record.id) ?? 0,
      childCount: record._count.children,
    }));
  }

  async create(draft: CategoryDraft): Promise<Category> {
    try {
      const record = await this.prisma.category.create({
        data: {
          slug: draft.content.es.slug,
          parentId: draft.parentId,
          sortOrder: draft.sortOrder,
          translations: { create: translationRows(draft) },
        },
        include: categoryInclude,
      });
      return toDomainCategory(record);
    } catch (error) {
      translateWriteError(error);
    }
  }

  async update(id: string, draft: CategoryDraft): Promise<Category> {
    const rows = translationRows(draft);
    try {
      const record = await this.prisma.category.update({
        where: { id },
        data: {
          slug: draft.content.es.slug,
          parentId: draft.parentId,
          sortOrder: draft.sortOrder,
          translations: {
            deleteMany: { locale: { notIn: rows.map((row) => row.locale) } },
            upsert: rows.map((row) => ({
              where: { categoryId_locale: { categoryId: id, locale: row.locale } },
              create: row,
              update: { name: row.name, slug: row.slug, description: row.description },
            })),
          },
        },
        include: categoryInclude,
      });
      return toDomainCategory(record);
    } catch (error) {
      translateWriteError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      translateWriteError(error);
    }
  }
}
