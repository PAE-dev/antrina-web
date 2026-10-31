import { type Locale } from '../../shared/locale.js';
import {
  type Product,
  type ProductIntention,
  type ProductSize,
  type ProductStatus,
  type ZodiacSign,
} from '../product.js';
import { type ProductDraft } from '../product-draft.js';

/** Catálogo público: solo productos activos. */
export interface ProductCriteria {
  /** Slug en español de la categoría; incluye sus subcategorías. */
  categorySlug?: string;
  intention?: ProductIntention;
  size?: ProductSize;
  sign?: ZodiacSign;
  featuredOnly?: boolean;
  limit?: number;
}

export const ADMIN_STOCK_FILTERS = ['low', 'out'] as const;

/** `low`: en o bajo la alerta de cada producto, con existencias. `out`: agotado. */
export type AdminStockFilter = (typeof ADMIN_STOCK_FILTERS)[number];

/** Búsqueda del panel: incluye borradores y archivados. */
export interface AdminProductCriteria {
  query?: string;
  status?: ProductStatus;
  /** Incluye las subcategorías de la categoría. */
  categoryId?: string;
  stock?: AdminStockFilter;
  excludeArchived?: boolean;
  limit: number;
  offset: number;
}

export interface InventorySummary {
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  unitsInStock: number;
  /** Solo productos con costo registrado. */
  stockCostCents: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
}

/**
 * Los adapters traducen las violaciones de unicidad a DomainError
 * (`product.duplicate_sku`, `product.duplicate_slug`).
 */
export interface ProductRepository {
  findMany(criteria: ProductCriteria): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  /** Producto activo cuyo slug coincide en alguno de los locales dados. */
  findActiveBySlug(slug: string, locales: readonly Locale[]): Promise<Product | null>;
  findManyForAdmin(criteria: AdminProductCriteria): Promise<ProductPage>;
  /** Existencias de los productos que no están archivados. */
  inventorySummary(): Promise<InventorySummary>;
  /** Crea el producto y, si tiene stock, su movimiento inicial. */
  create(draft: ProductDraft, actorId?: string): Promise<Product>;
  /** No cambia `stock`: las existencias solo se mueven con el puerto de inventario. */
  update(id: string, draft: ProductDraft): Promise<Product>;
}
