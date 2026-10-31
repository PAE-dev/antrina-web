import { type ProductBadgeCode, type ProductSummaryDto } from '@antrina/contracts';
import { Chip } from '@heroui/react';
import { formatMoney } from './format';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { type ImageLoader } from './types';

export type BadgeLabels = Record<ProductBadgeCode, string>;

interface ProductCardProps {
  product: ProductSummaryDto;
  href: string;
  locale: string;
  /** Intención o categoría del producto, se muestra como etiqueta de marca. */
  intention: string;
  badgeLabels: BadgeLabels;
  imagePlaceholderLabel: string;
  /** URLs optimizadas para la foto; sin él se usa la original. */
  imageLoader?: ImageLoader;
}

/** Con oferta se ve el precio normal tachado, discreto. Nunca porcentajes ni etiquetas de descuento. */
export function ProductCard({
  product,
  href,
  locale,
  intention,
  badgeLabels,
  imagePlaceholderLabel,
  imageLoader,
}: ProductCardProps) {
  const image = product.imageUrl
    ? (imageLoader?.(product.imageUrl) ?? { src: product.imageUrl })
    : null;
  return (
    <article className="group flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-md bg-bg-alt">
        <a href={href} tabIndex={-1} aria-hidden="true" className="block">
          <div className="transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]">
            {image ? (
              <img
                src={image.src}
                srcSet={image.srcSet}
                sizes={image.sizes}
                alt={product.imageAlt ?? ''}
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <PhotoPlaceholder label={imagePlaceholderLabel} className="rounded-none" />
            )}
          </div>
        </a>
        {product.badge && (
          <Chip size="sm" className="absolute left-3 top-3 bg-surface text-text">
            {badgeLabels[product.badge]}
          </Chip>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[16px] font-medium leading-snug tracking-[-0.015em] text-text">
            <a href={href} className="transition-colors hover:text-clay-strong">
              {product.name}
            </a>
          </h3>
          <p className="type-price flex shrink-0 flex-col items-end">
            <span>{formatMoney(product.price, locale)}</span>
            {product.compareAtPrice && (
              <del className="text-[13px] font-normal text-text-muted">
                {formatMoney(product.compareAtPrice, locale)}
              </del>
            )}
          </p>
        </div>
        <p className="type-label">{intention}</p>
      </div>
    </article>
  );
}
