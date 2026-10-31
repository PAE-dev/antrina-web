import {
  type AdjustStockRequest,
  type ClearStockRequest,
  type ClearStockResponse,
  type InventoryGroupDto,
  type InventoryItemDto,
  type InventoryQuery,
  type InventoryResponse,
  type StockMovementDto,
  type StockMovementListQuery,
  type StockMovementListResponse,
} from '@antrina/contracts';
import {
  ADMIN_STOCK_FILTERS,
  type AuditLog,
  type Category,
  type CategoryRepository,
  DEFAULT_LOCALE,
  DomainError,
  type Product,
  type ProductRepository,
  type StockMovement,
  type StockRepository,
  validateStockChange,
} from '@antrina/domain';
import { optionalString, requireInteger, requireOneOf, requireString } from '../shared/input.js';
import { parsePaging } from '../shared/paging.js';

const MANUAL_TYPES = ['RESTOCK', 'ADJUSTMENT'] as const;
const MAX_INVENTORY_PRODUCTS = 5000;
const MAX_CLEAR_PRODUCTS = 200;

function toInventoryItem(product: Product): InventoryItemDto {
  return {
    id: product.id,
    sku: product.sku,
    name: product.contentFor(DEFAULT_LOCALE).name,
    status: product.status,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    isLowStock: product.isLowStock(),
  };
}

const byCategoryOrder = (a: Category, b: Category) =>
  a.sortOrder - b.sortOrder ||
  a.nameFor(DEFAULT_LOCALE).localeCompare(b.nameFor(DEFAULT_LOCALE), DEFAULT_LOCALE);

const hasProducts = (group: InventoryGroupDto) => group.items.length + group.children.length > 0;

export function toStockMovementDto(movement: StockMovement): StockMovementDto {
  return { ...movement, createdAt: movement.createdAt.toISOString() };
}

/** Entradas de mercadería y correcciones manuales. Las ventas mueven el stock por su cuenta. */
export class AdjustStockUseCase {
  constructor(
    private readonly stock: StockRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(
    productId: string,
    input: AdjustStockRequest,
    actorId: string,
  ): Promise<StockMovementDto> {
    const change = validateStockChange({
      productId,
      type: requireOneOf(input?.type, MANUAL_TYPES, 'type'),
      quantity: requireInteger(input?.quantity, 'quantity'),
      note: optionalString(input?.note, 'note', 300)?.trim() || null,
      actorId,
    });
    const movement = await this.stock.apply(change);
    await this.audit.record({
      adminUserId: actorId,
      action: 'stock.adjusted',
      entityType: 'Product',
      entityId: productId,
      changes: {
        type: movement.type,
        quantity: movement.quantity,
        stockAfter: movement.stockAfter,
      },
    });
    return toStockMovementDto(movement);
  }
}

/** Existencias agrupadas por categoría y subcategoría. Lo archivado no cuenta como inventario. */
export class ListInventoryUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(query: InventoryQuery): Promise<InventoryResponse> {
    const q = query.q?.trim().slice(0, 100);
    const [categories, products] = await Promise.all([
      this.categories.findAll(),
      this.products.findManyForAdmin({
        ...(q ? { query: q } : {}),
        ...(query.stock ? { stock: requireOneOf(query.stock, ADMIN_STOCK_FILTERS, 'stock') } : {}),
        excludeArchived: true,
        limit: MAX_INVENTORY_PRODUCTS,
        offset: 0,
      }),
    ]);

    const ordered = [...categories].sort(byCategoryOrder);
    const toGroup = (category: Category, children: InventoryGroupDto[]): InventoryGroupDto => {
      const items = products.items
        .filter((product) => product.categoryId === category.id)
        .map(toInventoryItem)
        .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));
      return {
        categoryId: category.id,
        name: category.nameFor(DEFAULT_LOCALE),
        units:
          items.reduce((sum, item) => sum + item.stock, 0) +
          children.reduce((sum, child) => sum + child.units, 0),
        items,
        children,
      };
    };

    return {
      groups: ordered
        .filter((category) => !category.parentId)
        .map((root) =>
          toGroup(
            root,
            ordered
              .filter((category) => category.parentId === root.id)
              .map((child) => toGroup(child, []))
              .filter(hasProducts),
          ),
        )
        .filter(hasProducts),
    };
  }
}

/** Deja en cero varios productos de una vez: limpiar datos de prueba o cerrar una línea. */
export class ClearStockUseCase {
  constructor(
    private readonly stock: StockRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(input: ClearStockRequest, actorId: string): Promise<ClearStockResponse> {
    if (!Array.isArray(input?.productIds) || input.productIds.length === 0) {
      throw new DomainError('Elige al menos un producto', 'input.invalid');
    }
    if (input.productIds.length > MAX_CLEAR_PRODUCTS) {
      throw new DomainError(
        `Elige como máximo ${MAX_CLEAR_PRODUCTS} productos a la vez`,
        'input.invalid',
      );
    }
    const productIds = [...new Set(input.productIds.map((id) => requireString(id, 'productIds')))];
    const note = optionalString(input.note, 'note', 300)?.trim() || null;
    const movements = await this.stock.clear(productIds, note, actorId);
    for (const movement of movements) {
      await this.audit.record({
        adminUserId: actorId,
        action: 'stock.cleared',
        entityType: 'Product',
        entityId: movement.productId,
        changes: { quantity: movement.quantity, stockAfter: movement.stockAfter },
      });
    }
    return {
      cleared: movements.length,
      units: movements.reduce((sum, movement) => sum - movement.quantity, 0),
    };
  }
}

export class ListStockMovementsUseCase {
  constructor(private readonly stock: StockRepository) {}

  async execute(query: StockMovementListQuery): Promise<StockMovementListResponse> {
    const { page, pageSize, limit, offset } = parsePaging(query);
    const result = await this.stock.list({
      ...(query.productId ? { productId: query.productId } : {}),
      limit,
      offset,
    });
    return { data: result.items.map(toStockMovementDto), total: result.total, page, pageSize };
  }
}
