import { type ProductSummaryDto } from '@antrina/contracts';
import {
  type ImageUrlResolver,
  type Locale,
  type ProductRepository,
  type ProductSize,
  type ZodiacSign,
} from '@antrina/domain';
import { toProductSummary } from './catalog.mappers.js';

export interface ListProductsInput {
  locale: Locale;
  categorySlug?: string;
  size?: ProductSize;
  sign?: ZodiacSign;
  featuredOnly?: boolean;
  limit?: number;
}

const MAX_LIMIT = 48;

export class ListProductsUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(input: ListProductsInput): Promise<ProductSummaryDto[]> {
    const limit = Math.min(Math.max(input.limit ?? MAX_LIMIT, 1), MAX_LIMIT);
    const products = await this.products.findMany({
      ...(input.categorySlug ? { categorySlug: input.categorySlug } : {}),
      ...(input.size ? { size: input.size } : {}),
      ...(input.sign ? { sign: input.sign } : {}),
      ...(input.featuredOnly ? { featuredOnly: true } : {}),
      limit,
    });
    return products.map((product) => toProductSummary(product, input.locale, this.imageUrls));
  }
}
