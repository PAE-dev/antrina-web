import { type ProductSummaryDto } from '@antrina/contracts';
import { ButtonLink } from './ButtonLink';
import { type BadgeLabels, ProductCard } from './ProductCard';
import { SectionHeading } from './SectionHeading';
import { type CallToAction } from './types';

interface ProductGridProps {
  eyebrow: string;
  title: string;
  products: ProductSummaryDto[];
  locale: string;
  badgeLabels: BadgeLabels;
  imagePlaceholderLabel: string;
  intentionOf: (product: ProductSummaryDto) => string;
  productHref: (product: ProductSummaryDto) => string;
  viewAll?: CallToAction;
}

export function ProductGrid({
  eyebrow,
  title,
  products,
  locale,
  badgeLabels,
  imagePlaceholderLabel,
  intentionOf,
  productHref,
  viewAll,
}: ProductGridProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-14 md:gap-20">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <ul className="grid grid-cols-2 gap-x-5 gap-y-14 lg:grid-cols-4 lg:gap-x-8">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                href={productHref(product)}
                locale={locale}
                intention={intentionOf(product)}
                badgeLabels={badgeLabels}
                imagePlaceholderLabel={imagePlaceholderLabel}
              />
            </li>
          ))}
        </ul>
        {viewAll && (
          <div className="flex justify-center">
            <ButtonLink href={viewAll.href}>{viewAll.label}</ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
