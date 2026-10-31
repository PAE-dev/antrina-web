import { type UpsertCategoryRequest } from '@antrina/contracts';
import {
  Category,
  type CategoryDraft,
  type CategoryRepository,
  DomainError,
  type StockChange,
  type StockMovement,
  type StockRepository,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AdjustStockUseCase,
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  UpdateCategoryUseCase,
} from '../src/index.js';
import { MemoryAudit } from './fakes.js';

class InMemoryCategories implements CategoryRepository {
  readonly rows = new Map<string, { draft: CategoryDraft; productCount: number }>();
  private seq = 0;

  private toCategory(id: string, draft: CategoryDraft) {
    return Category.create({ id, slug: draft.content.es.slug, ...draft });
  }
  async findAll() {
    return [...this.rows].map(([id, row]) => this.toCategory(id, row.draft));
  }
  async findById(id: string) {
    const row = this.rows.get(id);
    return row ? this.toCategory(id, row.draft) : null;
  }
  async findAllWithCounts() {
    return [...this.rows].map(([id, row]) => ({
      category: this.toCategory(id, row.draft),
      productCount: row.productCount,
      activeProductCount: row.productCount,
      childCount: [...this.rows.values()].filter((other) => other.draft.parentId === id).length,
    }));
  }
  async create(draft: CategoryDraft) {
    const id = `cat-${++this.seq}`;
    this.rows.set(id, { draft, productCount: 0 });
    return this.toCategory(id, draft);
  }
  async update(id: string, draft: CategoryDraft) {
    const row = this.rows.get(id)!;
    this.rows.set(id, { ...row, draft });
    return this.toCategory(id, draft);
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
}

const categoryRequest = (name: string, parentId: string | null = null): UpsertCategoryRequest => ({
  parentId,
  sortOrder: 0,
  content: {
    es: { name, slug: name.toLowerCase(), description: null },
    en: null,
  },
});

describe('categorías y subcategorías', () => {
  let categories: InMemoryCategories;
  let create: CreateCategoryUseCase;
  let update: UpdateCategoryUseCase;
  let remove: DeleteCategoryUseCase;

  beforeEach(() => {
    categories = new InMemoryCategories();
    const audit = new MemoryAudit();
    create = new CreateCategoryUseCase(categories, audit);
    update = new UpdateCategoryUseCase(categories, audit);
    remove = new DeleteCategoryUseCase(categories, audit);
  });

  it('crea una subcategoría bajo una categoría principal', async () => {
    const parent = await create.execute(categoryRequest('Velas'), 'admin');
    const child = await create.execute(categoryRequest('Aromaticas', parent.id), 'admin');
    expect(child.parentId).toBe(parent.id);
  });

  it('no admite un tercer nivel', async () => {
    const parent = await create.execute(categoryRequest('Velas'), 'admin');
    const child = await create.execute(categoryRequest('Aromaticas', parent.id), 'admin');
    await expect(
      create.execute(categoryRequest('Lavanda', child.id), 'admin'),
    ).rejects.toMatchObject({ code: 'category.invalid_parent' });
  });

  it('una categoría con subcategorías no puede convertirse en subcategoría', async () => {
    const velas = await create.execute(categoryRequest('Velas'), 'admin');
    await create.execute(categoryRequest('Aromaticas', velas.id), 'admin');
    const otra = await create.execute(categoryRequest('Pulseras'), 'admin');
    await expect(
      update.execute(velas.id, categoryRequest('Velas', otra.id), 'admin'),
    ).rejects.toMatchObject({ code: 'category.invalid_parent' });
    await expect(
      update.execute(otra.id, categoryRequest('Pulseras', otra.id), 'admin'),
    ).rejects.toMatchObject({ code: 'category.invalid_parent' });
  });

  it('no borra categorías con productos o subcategorías', async () => {
    const velas = await create.execute(categoryRequest('Velas'), 'admin');
    const child = await create.execute(categoryRequest('Aromaticas', velas.id), 'admin');
    await expect(remove.execute(velas.id, 'admin')).rejects.toMatchObject({
      code: 'category.in_use',
    });

    categories.rows.get(child.id)!.productCount = 2;
    await expect(remove.execute(child.id, 'admin')).rejects.toMatchObject({
      code: 'category.in_use',
    });

    categories.rows.get(child.id)!.productCount = 0;
    await remove.execute(child.id, 'admin');
    await remove.execute(velas.id, 'admin');
    expect(categories.rows.size).toBe(0);
  });

  it('exige nombre y URL válidos', async () => {
    await expect(create.execute(categoryRequest(''), 'admin')).rejects.toMatchObject({
      code: 'category.invalid_name',
    });
    await expect(create.execute(categoryRequest('Con espacios'), 'admin')).rejects.toMatchObject({
      code: 'category.invalid_slug',
    });
  });
});

describe('movimientos de inventario', () => {
  let stock: number;
  let adjust: AdjustStockUseCase;
  let audit: MemoryAudit;

  const repo: StockRepository = {
    apply: async (change: StockChange): Promise<StockMovement> => {
      if (stock + change.quantity < 0) throw new DomainError('Sin stock', 'stock.insufficient');
      stock += change.quantity;
      return {
        id: 'm1',
        productId: change.productId,
        productName: 'Producto',
        productSku: 'SKU',
        type: change.type,
        quantity: change.quantity,
        stockAfter: stock,
        note: change.note,
        orderId: null,
        orderNumber: null,
        adminName: null,
        createdAt: new Date(),
      };
    },
    clear: async () => [],
    list: async () => ({ items: [], total: 0 }),
  };

  beforeEach(() => {
    stock = 5;
    audit = new MemoryAudit();
    adjust = new AdjustStockUseCase(repo, audit);
  });

  it('suma una entrada y limpia la nota', async () => {
    const movement = await adjust.execute(
      'p1',
      { type: 'RESTOCK', quantity: 10, note: '  Lote de octubre ' },
      'admin',
    );
    expect(movement.stockAfter).toBe(15);
    expect(movement.note).toBe('Lote de octubre');
    expect(audit.entries[0]?.action).toBe('stock.adjusted');
  });

  it('una corrección puede restar, sin dejar stock negativo', async () => {
    await expect(
      adjust.execute('p1', { type: 'ADJUSTMENT', quantity: -2, note: null }, 'admin'),
    ).resolves.toMatchObject({ stockAfter: 3 });
    await expect(
      adjust.execute('p1', { type: 'ADJUSTMENT', quantity: -9, note: null }, 'admin'),
    ).rejects.toMatchObject({ code: 'stock.insufficient' });
  });

  it('rechaza cantidades imposibles y las ventas manuales', async () => {
    const bad = [
      { type: 'RESTOCK', quantity: -1, note: null },
      { type: 'RESTOCK', quantity: 0, note: null },
      { type: 'ADJUSTMENT', quantity: 1.5, note: null },
      { type: 'SALE', quantity: 1, note: null },
    ];
    for (const input of bad) {
      await expect(adjust.execute('p1', input as never, 'admin')).rejects.toBeInstanceOf(
        DomainError,
      );
    }
    expect(stock).toBe(5);
  });
});
