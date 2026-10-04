import { type UpsertProductRequest } from '@antrina/contracts';
import { describe, expect, it } from 'vitest';
import { parseImageAlt, toProductDraft } from '../src/index.js';

const base: UpsertProductRequest = {
  sku: 'ant-amor-01',
  categoryId: 'cat-1',
  priceCents: 45000,
  currency: 'PEN',
  stock: 3,
  status: 'DRAFT',
  isFeatured: false,
  badge: null,
  origin: '  Taller Antrina, Lima ',
  content: {
    es: { name: 'Árbol del amor', slug: 'Arbol-Del-Amor', description: 'Cuarzo rosa.' },
    en: null,
  },
};

describe('borrador de producto desde el panel', () => {
  it('normaliza SKU, slug y origen', () => {
    const draft = toProductDraft(base);
    expect(draft.sku).toBe('ANT-AMOR-01');
    expect(draft.content.es.slug).toBe('arbol-del-amor');
    expect(draft.content.en).toBeUndefined();
    expect(draft.origin).toBe('Taller Antrina, Lima');
    expect(draft.price.amountInCents).toBe(45000);
  });

  it('rechaza valores fuera de catálogo o inválidos', () => {
    expect(() => toProductDraft({ ...base, priceCents: 0 })).toThrow(
      expect.objectContaining({ code: 'product.invalid_price' }),
    );
    expect(() => toProductDraft({ ...base, stock: -1 })).toThrow(
      expect.objectContaining({ code: 'product.invalid_stock' }),
    );
    expect(() => toProductDraft({ ...base, badge: 'SALE' as never })).toThrow(
      expect.objectContaining({ code: 'input.invalid' }),
    );
    expect(() =>
      toProductDraft({
        ...base,
        content: { es: { ...base.content.es, slug: 'con espacios' }, en: null },
      }),
    ).toThrow(expect.objectContaining({ code: 'product.invalid_slug' }));
  });

  it('limpia el texto alternativo de las fotos', () => {
    expect(parseImageAlt({ es: '  Árbol de amatista ', en: '', fr: 'x' })).toEqual({
      es: 'Árbol de amatista',
    });
  });
});
