import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ListCategoriesUseCase, ListProductsUseCase } from '@antrina/application';
import { type ListCategoriesResponse, type ListProductsResponse } from '@antrina/contracts';
import { resolveLocale } from '@antrina/domain';
import { parseBoolean, parsePositiveInt } from '../../shared/presentation/query-parsers.js';

@Controller('catalog')
export class CatalogController {
  constructor(
    @Inject(ListProductsUseCase) private readonly listProducts: ListProductsUseCase,
    @Inject(ListCategoriesUseCase) private readonly listCategories: ListCategoriesUseCase,
  ) {}

  @Get('products')
  async products(
    @Query('locale') locale?: string,
    @Query('category') category?: string,
    @Query('featured') featured?: string,
    @Query('limit') limit?: string,
  ): Promise<ListProductsResponse> {
    const parsedLimit = parsePositiveInt(limit);
    const data = await this.listProducts.execute({
      locale: resolveLocale(locale),
      featuredOnly: parseBoolean(featured),
      ...(category ? { categorySlug: category } : {}),
      ...(parsedLimit ? { limit: parsedLimit } : {}),
    });
    return { data };
  }

  @Get('categories')
  async categories(@Query('locale') locale?: string): Promise<ListCategoriesResponse> {
    const data = await this.listCategories.execute({ locale: resolveLocale(locale) });
    return { data };
  }
}
