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
  /** Intención del árbol (p. ej. "Abundancia"), se muestra como etiqueta mono. */
  intention: string;
  badgeLabels: BadgeLabels;
  imagePlaceholderLabel: string;
  /** URLs optimizadas para la foto; sin él se usa la original. */
  imageLoader?: ImageLoader;
}

/** Sin descuentos visibles: nunca mostrar precio tachado ni porcentajes. */
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
            <a href={href} className="transition-colors hover:text-brand">
              {product.name}
            </a>
          </h3>
          <p className="type-price shrink-0">{formatMoney(product.price, locale)}</p>
        </div>
        <p className="type-label">{intention}</p>
      </div>
    </article>
  );
}
