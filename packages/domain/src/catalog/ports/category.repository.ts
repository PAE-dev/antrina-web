import { type Category, type CategoryDraft } from '../category.js';

export interface CategoryWithCounts {
  category: Category;
  /** Productos asignados directamente a esta categoría. */
  productCount: number;
  /** De ellos, los publicados en la tienda. */
  activeProductCount: number;
  childCount: number;
}

/**
 * Los adapters traducen las violaciones de unicidad y de relación a DomainError
 * (`category.duplicate_slug`, `category.not_found`).
 */
export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findAllWithCounts(): Promise<CategoryWithCounts[]>;
  create(draft: CategoryDraft): Promise<Category>;
  update(id: string, draft: CategoryDraft): Promise<Category>;
  delete(id: string): Promise<void>;
}
