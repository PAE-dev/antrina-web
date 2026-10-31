import {
  type AdjustStockRequest,
  type StockMovementDto,
  type StockMovementListQuery,
  type StockMovementListResponse,
} from '@antrina/contracts';
import {
  type AuditLog,
  type StockMovement,
  type StockRepository,
  validateStockChange,
} from '@antrina/domain';
import { optionalString, requireInteger, requireOneOf } from '../shared/input.js';
import { parsePaging } from '../shared/paging.js';

const MANUAL_TYPES = ['RESTOCK', 'ADJUSTMENT'] as const;

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
