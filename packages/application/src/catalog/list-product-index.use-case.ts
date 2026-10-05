import { type ProductIndexItemDto } from '@antrina/contracts';
import { type ImageUrlResolver, type ProductRepository } from '@antrina/domain';
import { toProductIndexItem } from './catalog.mappers.js';

/** Catálogo activo completo para el sitemap y el feed de Google Merchant Center. */
export class ListProductIndexUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(): Promise<ProductIndexItemDto[]> {
    const products = await this.products.findMany({});
    return products.map((product) => toProductIndexItem(product, this.imageUrls));
  }
}
