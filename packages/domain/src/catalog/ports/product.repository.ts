import { type Product, type ProductStatus } from '../product.js';
import { type ProductDraft } from '../product-draft.js';

export interface ProductCriteria {
  categorySlug?: string;
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
  findManyForAdmin(criteria: AdminProductCriteria): Promise<ProductPage>;
  create(draft: ProductDraft): Promise<Product>;
  update(id: string, draft: ProductDraft): Promise<Product>;
}
