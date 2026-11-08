import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  GetProductUseCase,
  ListCategoriesUseCase,
  ListProductIndexUseCase,
  ListProductsUseCase,
  ListWorldShopUseCase,
} from '@antrina/application';
import {
  type ListCategoriesResponse,
  type ListProductsResponse,
  type ProductDetailDto,
  type ProductIndexResponse,
  type WorldShopResponse,
} from '@antrina/contracts';
import {
  isProductIntention,
  isZodiacSign,
  PRODUCT_SIZES,
  type ProductSize,
  resolveLocale,
} from '@antrina/domain';
import { parseBoolean, parsePositiveInt } from '../../shared/presentation/query-parsers.js';

const isProductSize = (value: string | undefined): value is ProductSize =>
  (PRODUCT_SIZES as readonly (string | undefined)[]).includes(value);

@Controller('catalog')
export class CatalogController {
  constructor(
    @Inject(ListProductsUseCase) private readonly listProducts: ListProductsUseCase,
    @Inject(GetProductUseCase) private readonly getProduct: GetProductUseCase,
    @Inject(ListProductIndexUseCase) private readonly listProductIndex: ListProductIndexUseCase,
    @Inject(ListCategoriesUseCase) private readonly listCategories: ListCategoriesUseCase,
    @Inject(ListWorldShopUseCase) private readonly listWorldShop: ListWorldShopUseCase,
  ) {}

  @Get('products')
  async products(
    @Query('locale') locale?: string,
    @Query('category') category?: string,
    @Query('intention') intention?: string,
    @Query('size') size?: string,
    @Query('sign') sign?: string,
    @Query('featured') featured?: string,
    @Query('limit') limit?: string,
  ): Promise<ListProductsResponse> {
    const parsedLimit = parsePositiveInt(limit);
    const data = await this.listProducts.execute({
      locale: resolveLocale(locale),
      featuredOnly: parseBoolean(featured),
      ...(category ? { categorySlug: category } : {}),
      ...(isProductIntention(intention) ? { intention } : {}),
      ...(isProductSize(size) ? { size } : {}),
      ...(isZodiacSign(sign) ? { sign } : {}),
      ...(parsedLimit ? { limit: parsedLimit } : {}),
    });
    return { data };
  }

  @Get('products/:slug')
  product(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ): Promise<ProductDetailDto> {
    return this.getProduct.execute({ slug, locale: resolveLocale(locale) });
  }

  @Get('product-index')
  async productIndex(): Promise<ProductIndexResponse> {
    return { data: await this.listProductIndex.execute() };
  }

  @Get('categories')
  async categories(@Query('locale') locale?: string): Promise<ListCategoriesResponse> {
    const data = await this.listCategories.execute({ locale: resolveLocale(locale) });
    return { data };
  }

  /** Tienda de un mundo de `/mundos` (`shop.categoryPrefix`): sus productos y subcategorías. */
  @Get('world-shop')
  worldShop(
    @Query('prefix') prefix?: string,
    @Query('locale') locale?: string,
  ): Promise<WorldShopResponse> {
    return this.listWorldShop.execute({ prefix: prefix ?? '', locale: resolveLocale(locale) });
  }
}
