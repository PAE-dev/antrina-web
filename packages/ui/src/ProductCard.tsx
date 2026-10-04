import { type ProductBadgeCode, type ProductSummaryDto } from '@antrina/contracts';
import { formatMoney } from './format';
import { PhotoPlaceholder } from './PhotoPlaceholder';

export type BadgeLabels = Record<ProductBadgeCode, string>;

interface ProductCardProps {
  product: ProductSummaryDto;
  href: string;
  locale: string;
  /** Intención del árbol (p. ej. "Abundancia"), se muestra como eyebrow. */
  intention: string;
  badgeLabels: BadgeLabels;
  imagePlaceholderLabel: string;
}

/** Sin descuentos visibles: nunca mostrar precio tachado ni porcentajes. */
export function ProductCard({
  product,
  href,
  locale,
  intention,
  badgeLabels,
  imagePlaceholderLabel,
}: ProductCardProps) {
  return (
    <article className="group flex flex-col gap-4">
      <div className="relative overflow-hidden bg-bg-alt">
        <a href={href} tabIndex={-1} aria-hidden="true" className="block">
          <div className="transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.imageAlt ?? ''}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <PhotoPlaceholder label={imagePlaceholderLabel} />
            )}
          </div>
        </a>
        {product.badge && (
          <span className="label-tag absolute left-3 top-3">{badgeLabels[product.badge]}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="type-eyebrow">{intention}</p>
        <h3 className="font-display text-[22px] font-medium leading-tight text-text md:text-[24px]">
          <a href={href} className="transition-colors hover:text-brand">
            {product.name}
          </a>
        </h3>
        <p className="type-price">{formatMoney(product.price, locale)}</p>
      </div>
    </article>
  );
}
