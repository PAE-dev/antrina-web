import { type Category } from '../category.js';

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
}
