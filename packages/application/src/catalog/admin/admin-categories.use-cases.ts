import { type AdminCategoryDto, type UpsertCategoryRequest } from '@antrina/contracts';
import {
  type AuditLog,
  type Category,
  type CategoryContent,
  type CategoryDraft,
  type CategoryRepository,
  DomainError,
  validateCategoryDraft,
} from '@antrina/domain';
import { notFound, optionalString, requireInteger, requireString } from '../../shared/input.js';
import { toAdminCategoryDto } from './admin-catalog.mappers.js';

const categoryNotFound = () => notFound('Categoría', 'category.not_found');

function parseContent(value: unknown, locale: string): CategoryContent {
  if (typeof value !== 'object' || value === null) {
    throw new DomainError(`Falta el nombre (${locale})`, 'category.invalid_content');
  }
  const raw = value as Record<string, unknown>;
  return {
    name: requireString(raw.name, `content.${locale}.name`, 200).trim(),
    slug: requireString(raw.slug, `content.${locale}.slug`, 200).trim().toLowerCase(),
    description: optionalString(raw.description, `content.${locale}.description`)?.trim() || null,
  };
}

function toCategoryDraft(input: UpsertCategoryRequest): CategoryDraft {
  if (typeof input !== 'object' || input === null || typeof input.content !== 'object') {
    throw new DomainError('Cuerpo de la petición inválido', 'input.invalid');
  }
  const rawContent = input.content as unknown as Record<string, unknown>;
  const en = rawContent.en ? parseContent(rawContent.en, 'en') : null;
  return validateCategoryDraft({
    parentId: optionalString(input.parentId, 'parentId', 64),
    sortOrder: requireInteger(input.sortOrder ?? 0, 'sortOrder'),
    content: { es: parseContent(rawContent.es, 'es'), ...(en ? { en } : {}) },
  });
}

/** Solo hay dos niveles: categoría y subcategoría. */
async function assertValidParent(
  categories: CategoryRepository,
  parentId: string | null,
  ownId: string | null,
): Promise<void> {
  if (!parentId) return;
  if (parentId === ownId) {
    throw new DomainError(
      'Una categoría no puede estar dentro de sí misma',
      'category.invalid_parent',
    );
  }
  const parent = await categories.findById(parentId);
  if (!parent) throw new DomainError('La categoría superior no existe', 'category.invalid_parent');
  if (parent.parentId) {
    throw new DomainError('Solo se admite un nivel de subcategoría', 'category.invalid_parent');
  }
}

export class ListAdminCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<AdminCategoryDto[]> {
    const rows = await this.categories.findAllWithCounts();
    return rows.map(toAdminCategoryDto);
  }
}

export class CreateCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: UpsertCategoryRequest, actorId: string): Promise<AdminCategoryDto> {
    const draft = toCategoryDraft(input);
    await assertValidParent(this.categories, draft.parentId, null);
    const category = await this.categories.create(draft);
    await this.audit.record({
      adminUserId: actorId,
      action: 'category.created',
      entityType: 'Category',
      entityId: category.id,
      changes: { slug: category.slug, parentId: category.parentId },
    });
    return toAdminCategoryDto({ category, productCount: 0, activeProductCount: 0, childCount: 0 });
  }
}

export class UpdateCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(
    id: string,
    input: UpsertCategoryRequest,
    actorId: string,
  ): Promise<AdminCategoryDto> {
    const rows = await this.categories.findAllWithCounts();
    const current = rows.find((row) => row.category.id === id);
    if (!current) throw categoryNotFound();
    const draft = toCategoryDraft(input);
    await assertValidParent(this.categories, draft.parentId, id);
    if (draft.parentId && current.childCount > 0) {
      throw new DomainError(
        'Esta categoría tiene subcategorías: no puede convertirse en subcategoría',
        'category.invalid_parent',
      );
    }
    const category: Category = await this.categories.update(id, draft);
    await this.audit.record({
      adminUserId: actorId,
      action: 'category.updated',
      entityType: 'Category',
      entityId: id,
      changes: { before: current.category.content, after: category.content },
    });
    return toAdminCategoryDto({ ...current, category });
  }
}

/** Solo se borra una categoría vacía: los productos no quedan nunca sin categoría. */
export class DeleteCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, actorId: string): Promise<void> {
    const rows = await this.categories.findAllWithCounts();
    const current = rows.find((row) => row.category.id === id);
    if (!current) throw categoryNotFound();
    if (current.childCount > 0) {
      throw new DomainError('Primero elimina o mueve sus subcategorías', 'category.in_use');
    }
    if (current.productCount > 0) {
      throw new DomainError(
        `Tiene ${current.productCount} producto(s): muévelos a otra categoría antes de eliminarla`,
        'category.in_use',
      );
    }
    await this.categories.delete(id);
    await this.audit.record({
      adminUserId: actorId,
      action: 'category.deleted',
      entityType: 'Category',
      entityId: id,
      changes: { slug: current.category.slug },
    });
  }
}
