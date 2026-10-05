import { type Locale } from '../../shared/locale.js';
import { type Product, type ProductSize, type ProductStatus, type ZodiacSign } from '../product.js';
import { type ProductDraft } from '../product-draft.js';

/** Catálogo público: solo productos activos. */
export interface ProductCriteria {
  categorySlug?: string;
  size?: ProductSize;
  sign?: ZodiacSign;
  featuredOnly?: boolean;
  limit?: number;
}

/** Búsqueda del panel: incluye borradores y archivados. */
export interface AdminProductCriteria {
  query?: string;
  status?: ProductStatus;
  limit: number;
  offset: number;
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
  create(draft: ProductDraft): Promise<Product>;
  update(id: string, draft: ProductDraft): Promise<Product>;
}
