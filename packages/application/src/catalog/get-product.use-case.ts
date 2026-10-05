import { type ProductDetailDto } from '@antrina/contracts';
import {
  DEFAULT_LOCALE,
  type ImageUrlResolver,
  type Locale,
  type ProductRepository,
} from '@antrina/domain';
import { notFound } from '../shared/input.js';
import { toProductDetail } from './catalog.mappers.js';

export interface GetProductInput {
  slug: string;
  locale: Locale;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Ficha pública. Acepta el slug del locale pedido o el del español: un producto sin traducir
 * se sirve en español también bajo la ruta inglesa.
 */
export class GetProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly imageUrls: ImageUrlResolver,
  ) {}

  async execute(input: GetProductInput): Promise<ProductDetailDto> {
    const slug = input.slug.trim().toLowerCase();
    const product =
      SLUG_PATTERN.test(slug) && slug.length <= 140
        ? await this.products.findActiveBySlug(slug, [
            ...new Set<Locale>([input.locale, DEFAULT_LOCALE]),
          ])
        : null;
    if (!product) throw notFound('Producto', 'product.not_found');
    return toProductDetail(product, input.locale, this.imageUrls);
  }
}
