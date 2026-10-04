import {
  type AdminCategoryDto,
  type AdminProductDto,
  type AdminProductListQuery,
  type AdminProductListResponse,
  type UpsertProductRequest,
} from '@antrina/contracts';
import {
  type AuditLog,
  type CategoryRepository,
  type ImageUrlResolver,
  PRODUCT_STATUSES,
  type Product,
  type ProductRepository,
} from '@antrina/domain';
import { notFound, requireOneOf } from '../../shared/input.js';
import {
  toAdminCategoryDto,
  toAdminProductDto,
  toAdminProductListItem,
} from './admin-catalog.mappers.js';
import { draftFromProduct, toProductDraft } from './product-draft.input.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export const productNotFound = () => notFound('Producto', 'product.not_found');

export async function loadProduct(products: ProductRepository, id: string): Promise<Product> {
  const product = await products.findById(id);
  if (!product) throw productNotFound();
  return product;
}

export class ListAdminProductsUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(query: AdminProductListQuery): Promise<AdminProductListResponse> {
    const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const page = clampInt(query.page, 1, 1, 10_000);
    const q = query.q?.trim().slice(0, 100);
    const status = query.status
      ? requireOneOf(query.status, PRODUCT_STATUSES, 'status')
      : undefined;
    const result = await this.products.findManyForAdmin({
      ...(q ? { query: q } : {}),
      ...(status ? { status } : {}),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      data: result.items.map((product) => toAdminProductListItem(product, this.imageUrls)),
      total: result.total,
      page,
      pageSize,
    };
  }
}

export class GetAdminProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(id: string): Promise<AdminProductDto> {
    return toAdminProductDto(await loadProduct(this.products, id), this.imageUrls);
  }
}

export class CreateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: UpsertProductRequest, actorId: string): Promise<AdminProductDto> {
    const product = await this.products.create(toProductDraft(input));
    await this.audit.record({
      adminUserId: actorId,
      action: 'product.created',
      entityType: 'Product',
      entityId: product.id,
      changes: { sku: product.sku, status: product.status },
    });
    return toAdminProductDto(product, this.imageUrls);
  }
}

export class UpdateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
    private readonly audit: AuditLog,
  ) {}

  async execute(
    id: string,
    input: UpsertProductRequest,
    actorId: string,
  ): Promise<AdminProductDto> {
    const before = await loadProduct(this.products, id);
    const draft = toProductDraft(input);
    const product = await this.products.update(id, draft);
    await this.audit.record({
      adminUserId: actorId,
      action: 'product.updated',
      entityType: 'Product',
      entityId: id,
      changes: diffProduct(before, product),
    });
    return toAdminProductDto(product, this.imageUrls);
  }
}

/** Los productos no se borran (pedidos e historial los referencian): se archivan. */
export class ArchiveProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
    private readonly audit: AuditLog,
  ) {}

  async execute(id: string, actorId: string): Promise<AdminProductDto> {
    const before = await loadProduct(this.products, id);
    const product = await this.products.update(id, {
      ...draftFromProduct(before),
      status: 'ARCHIVED',
    });
    await this.audit.record({
      adminUserId: actorId,
      action: 'product.archived',
      entityType: 'Product',
      entityId: id,
      changes: { status: { from: before.status, to: 'ARCHIVED' } },
    });
    return toAdminProductDto(product, this.imageUrls);
  }
}

export class ListAdminCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<AdminCategoryDto[]> {
    const categories = await this.categories.findAll();
    return categories.map(toAdminCategoryDto);
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function diffProduct(before: Product, after: Product): Record<string, unknown> {
  const pick = (product: Product) => ({
    sku: product.sku,
    categoryId: product.categoryId,
    priceCents: product.price.amountInCents,
    currency: product.price.currency,
    stock: product.stock,
    status: product.status,
    isFeatured: product.isFeatured,
    badge: product.badge,
    origin: product.origin,
    content: product.content,
  });
  const a = pick(before);
  const b = pick(after);
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof typeof a)[]) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      changes[key] = { from: a[key], to: b[key] };
    }
  }
  return changes;
}
