import { type CategoryDto } from '@antrina/contracts';
import { type CategoryRepository, type Locale } from '@antrina/domain';
import { toCategoryDto } from './catalog.mappers.js';

export interface ListCategoriesInput {
  locale: Locale;
}

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(input: ListCategoriesInput): Promise<CategoryDto[]> {
    const rows = await this.categories.findAllWithCounts();
    return rows
      .toSorted((a, b) => a.category.sortOrder - b.category.sortOrder)
      .map((row) => toCategoryDto(row, input.locale));
  }
}
