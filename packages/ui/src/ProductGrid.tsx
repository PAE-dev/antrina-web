import { type ProductSummaryDto } from '@antrina/contracts';
import { ArrowLink } from './ButtonLink';
import { type BadgeLabels, ProductCard } from './ProductCard';
import { SectionHeading } from './SectionHeading';
import { type CallToAction } from './types';

interface ProductGridProps {
  label: string;
  index?: number;
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
  label,
  index,
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
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading
          label={label}
          index={index}
          title={title}
          aside={viewAll && <ArrowLink href={viewAll.href}>{viewAll.label}</ArrowLink>}
        />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
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
      </div>
    </section>
  );
}
