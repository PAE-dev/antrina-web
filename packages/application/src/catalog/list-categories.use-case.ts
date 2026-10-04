import { type CategoryDto } from '@antrina/contracts';
import { type CategoryRepository, type Locale } from '@antrina/domain';
import { toCategoryDto } from './catalog.mappers.js';

export interface ListCategoriesInput {
  locale: Locale;
}

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(input: ListCategoriesInput): Promise<CategoryDto[]> {
    const categories = await this.categories.findAll();
    return categories
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => toCategoryDto(category, input.locale));
  }
}
