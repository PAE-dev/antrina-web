import {
  Category,
  DomainError,
  Money,
  Product,
  type ProductPiece,
  type ProductPieceRepository,
  type ProductRepository,
  type ProductStatus,
  type StockMovement,
  type StockRepository,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClearStockUseCase,
  GenerateProductPiecesUseCase,
  ListInventoryUseCase,
  VoidProductPieceUseCase,
} from '../src/index.js';
import { MemoryAudit } from './fakes.js';

const category = (id: string, name: string, parentId: string | null = null, sortOrder = 0) =>
  Category.create({
    id,
    slug: id,
    parentId,
    sortOrder,
    content: { es: { name, slug: id, description: null } },
  });

const product = (id: string, categoryId: string, stock: number, status: ProductStatus = 'ACTIVE') =>
  Product.create({
    id,
    sku: id.toUpperCase(),
    categoryId,
    categorySlug: categoryId,
    categoryContent: { es: { name: categoryId, slug: categoryId } },
    price: Money.ofCents(1000, 'PEN'),
    compareAtPrice: null,
    cost: null,
    stock,
    lowStockThreshold: 3,
    images: [],
    status,
    isFeatured: false,
    badge: null,
    size: null,
    intention: null,
    signs: [],
    origin: null,
    content: {
      es: { name: id, slug: id, description: '', metaTitle: null, metaDescription: null },
    },
    updatedAt: new Date(),
  });

describe('inventario por categorías', () => {
  const categories = [
    category('toritos', 'Toritos de Pucará', null, 2),
    category('arboles', 'Árboles de cuarzo', null, 1),
    category('mini', 'Mini', 'arboles', 1),
    category('vacia', 'Sin productos', null, 3),
  ];

  const useCase = (products: Product[]) =>
    new ListInventoryUseCase(
      {
        findManyForAdmin: async () => ({ items: products, total: products.length }),
      } as unknown as ProductRepository,
      { findAll: async () => categories } as never,
    );

  it('ordena por categoría, anida subcategorías y suma sus unidades', async () => {
    const { groups } = await useCase([
      product('torito-par', 'toritos', 4),
      product('arbol-b', 'arboles', 10),
      product('arbol-a', 'arboles', 2),
      product('mini-1', 'mini', 20),
    ]).execute({});

    expect(groups.map((group) => group.categoryId)).toEqual(['arboles', 'toritos']);
    const [arboles] = groups;
    expect(arboles?.units).toBe(32);
    expect(arboles?.items.map((item) => item.id)).toEqual(['arbol-a', 'arbol-b']);
    expect(arboles?.children.map((child) => [child.name, child.units])).toEqual([['Mini', 20]]);
  });

  it('oculta categorías vacías y muestra una principal si solo su subcategoría tiene productos', async () => {
    const { groups } = await useCase([product('mini-1', 'mini', 5)]).execute({});
    expect(groups.map((group) => group.categoryId)).toEqual(['arboles']);
    expect(groups[0]?.items).toEqual([]);
    expect(groups[0]?.units).toBe(5);
  });

  it('pide excluir lo archivado para que coincida con el total de unidades', async () => {
    let criteria: unknown;
    await new ListInventoryUseCase(
      {
        findManyForAdmin: async (received: unknown) => {
          criteria = received;
          return { items: [], total: 0 };
        },
      } as unknown as ProductRepository,
      { findAll: async () => categories } as never,
    ).execute({ q: ' torito ', stock: 'low' });
    expect(criteria).toMatchObject({ query: 'torito', stock: 'low', excludeArchived: true });
  });
});

describe('dejar el stock en cero', () => {
  const movement = (productId: string, quantity: number): StockMovement => ({
    id: `m-${productId}`,
    productId,
    productName: productId,
    productSku: productId,
    type: 'ADJUSTMENT',
    quantity,
    stockAfter: 0,
    note: null,
    orderId: null,
    orderNumber: null,
    adminName: null,
    createdAt: new Date(),
  });

  it('retira las unidades, deja rastro por producto y no repite ids', async () => {
    let received: readonly string[] = [];
    const audit = new MemoryAudit();
    const stock = {
      clear: async (ids: readonly string[]) => {
        received = ids;
        return [movement('a', -10), movement('b', -3)];
      },
    } as unknown as StockRepository;

    const result = await new ClearStockUseCase(stock, audit).execute(
      { productIds: ['a', 'b', 'a', 'c'], note: ' prueba ' },
      'admin',
    );

    expect(received).toEqual(['a', 'b', 'c']);
    expect(result).toEqual({ cleared: 2, units: 13 });
    expect(audit.entries.map((entry) => entry.entityId)).toEqual(['a', 'b']);
  });

  it('rechaza listas vacías, demasiado largas o inválidas', async () => {
    const useCase = new ClearStockUseCase({} as StockRepository, new MemoryAudit());
    const rejects = (productIds: unknown) =>
      expect(
        useCase.execute({ productIds: productIds as string[], note: null }, 'admin'),
      ).rejects.toMatchObject({ code: 'input.invalid' } satisfies Partial<DomainError>);
    await rejects([]);
    await rejects('a');
    await rejects([1]);
    await rejects(Array.from({ length: 201 }, (_, index) => String(index)));
  });
});

class InMemoryPieces implements ProductPieceRepository {
  readonly rows: ProductPiece[] = [];

  async listByProduct(productId: string) {
    return this.rows.filter((row) => row.productId === productId);
  }
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async createBatch(productId: string, codes: readonly string[]) {
    const start = (await this.listByProduct(productId)).length + 1;
    const created = codes.map((code, index) => ({
      id: `piece-${code}`,
      productId,
      serial: start + index,
      code,
      voidedAt: null,
      createdAt: new Date(),
    }));
    this.rows.push(...created);
    return created;
  }
  async markVoided(id: string) {
    const row = this.rows.find((candidate) => candidate.id === id)!;
    row.voidedAt = new Date();
    return row;
  }
}

describe('códigos QR por pieza', () => {
  let pieces: InMemoryPieces;
  let audit: MemoryAudit;
  let sequence: number;
  let status: ProductStatus;
  let generate: GenerateProductPiecesUseCase;

  beforeEach(() => {
    pieces = new InMemoryPieces();
    audit = new MemoryAudit();
    sequence = 0;
    status = 'ACTIVE';
    generate = new GenerateProductPiecesUseCase(
      {
        findById: async (id: string) =>
          id === 'torito' ? product(id, 'toritos', 5, status) : null,
      } as unknown as ProductRepository,
      pieces,
      { generate: () => `code-${++sequence}` },
      audit,
    );
  });

  it('numera de corrido sin mover el stock y registra el lote', async () => {
    await generate.execute('torito', { quantity: 2 }, 'admin');
    const { data } = await generate.execute('torito', { quantity: 3 }, 'admin');
    expect(data.map((piece) => piece.serial)).toEqual([3, 4, 5]);
    expect(new Set(pieces.rows.map((row) => row.code)).size).toBe(5);
    expect(audit.entries.at(-1)).toMatchObject({
      action: 'product_piece.generated',
      entityId: 'torito',
      changes: { quantity: 3, fromSerial: 3, toSerial: 5 },
    });
  });

  it('valida la cantidad y el producto', async () => {
    for (const quantity of [0, -1, 201, 1.5]) {
      await expect(generate.execute('torito', { quantity }, 'admin')).rejects.toBeInstanceOf(
        DomainError,
      );
    }
    await expect(generate.execute('nadie', { quantity: 1 }, 'admin')).rejects.toMatchObject({
      code: 'product.not_found',
    });
    status = 'ARCHIVED';
    await expect(generate.execute('torito', { quantity: 1 }, 'admin')).rejects.toMatchObject({
      code: 'piece.product_archived',
    });
    expect(pieces.rows).toHaveLength(0);
  });

  it('anula un código del producto indicado y no otro', async () => {
    const { data } = await generate.execute('torito', { quantity: 1 }, 'admin');
    const piece = data[0]!;
    const voidPiece = new VoidProductPieceUseCase(pieces, audit);

    await expect(voidPiece.execute('otro', piece.id, 'admin')).rejects.toMatchObject({
      code: 'piece.not_found',
    });
    const voided = await voidPiece.execute('torito', piece.id, 'admin');
    expect(voided.voidedAt).not.toBeNull();

    const auditCount = audit.entries.length;
    await voidPiece.execute('torito', piece.id, 'admin');
    expect(audit.entries).toHaveLength(auditCount);
  });
});
