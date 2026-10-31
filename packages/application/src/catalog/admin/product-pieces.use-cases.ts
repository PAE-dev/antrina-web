import {
  type GenerateProductPiecesRequest,
  type ProductPieceDto,
  type ProductPieceListResponse,
} from '@antrina/contracts';
import {
  type AuditLog,
  DomainError,
  MAX_PIECES_PER_BATCH,
  type PieceCodeGenerator,
  type ProductPiece,
  type ProductPieceRepository,
  type ProductRepository,
} from '@antrina/domain';
import { notFound, requireInteger } from '../../shared/input.js';
import { loadProduct } from './admin-products.use-cases.js';

function toProductPieceDto(piece: ProductPiece): ProductPieceDto {
  return {
    ...piece,
    voidedAt: piece.voidedAt?.toISOString() ?? null,
    createdAt: piece.createdAt.toISOString(),
  };
}

export class ListProductPiecesUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly pieces: ProductPieceRepository,
  ) {}

  async execute(productId: string): Promise<ProductPieceListResponse> {
    await loadProduct(this.products, productId);
    const pieces = await this.pieces.listByProduct(productId);
    return { data: pieces.map(toProductPieceDto) };
  }
}

export class GenerateProductPiecesUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly pieces: ProductPieceRepository,
    private readonly codes: PieceCodeGenerator,
    private readonly audit: AuditLog,
  ) {}

  async execute(
    productId: string,
    input: GenerateProductPiecesRequest,
    actorId: string,
  ): Promise<ProductPieceListResponse> {
    const quantity = requireInteger(input?.quantity, 'quantity');
    if (quantity < 1 || quantity > MAX_PIECES_PER_BATCH) {
      throw new DomainError(
        `Genera entre 1 y ${MAX_PIECES_PER_BATCH} códigos a la vez`,
        'piece.invalid_quantity',
      );
    }
    const product = await loadProduct(this.products, productId);
    if (product.status === 'ARCHIVED') {
      throw new DomainError('El producto está archivado', 'piece.product_archived');
    }
    const created = await this.pieces.createBatch(
      productId,
      Array.from({ length: quantity }, () => this.codes.generate()),
    );
    await this.audit.record({
      adminUserId: actorId,
      action: 'product_piece.generated',
      entityType: 'Product',
      entityId: productId,
      changes: {
        quantity,
        fromSerial: created[0]?.serial ?? null,
        toSerial: created.at(-1)?.serial ?? null,
      },
    });
    return { data: created.map(toProductPieceDto) };
  }
}

export class VoidProductPieceUseCase {
  constructor(
    private readonly pieces: ProductPieceRepository,
    private readonly audit: AuditLog,
  ) {}

  async execute(productId: string, pieceId: string, actorId: string): Promise<ProductPieceDto> {
    const piece = await this.pieces.findById(pieceId);
    if (!piece || piece.productId !== productId) throw notFound('Código', 'piece.not_found');
    if (piece.voidedAt) return toProductPieceDto(piece);
    const voided = await this.pieces.markVoided(pieceId);
    await this.audit.record({
      adminUserId: actorId,
      action: 'product_piece.voided',
      entityType: 'Product',
      entityId: productId,
      changes: { serial: piece.serial },
    });
    return toProductPieceDto(voided);
  }
}
