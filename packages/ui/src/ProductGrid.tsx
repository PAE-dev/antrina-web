import { type ProductSummaryDto } from '@antrina/contracts';
import { ArrowLink } from './ButtonLink';
import { type BadgeLabels, ProductCard } from './ProductCard';
import { SectionHeading } from './SectionHeading';
import { type CallToAction, type ImageLoader } from './types';

interface ProductListProps {
  products: ProductSummaryDto[];
  locale: string;
  badgeLabels: BadgeLabels;
  imagePlaceholderLabel: string;
  intentionOf: (product: ProductSummaryDto) => string;
  productHref: (product: ProductSummaryDto) => string;
  imageLoader?: ImageLoader;
}

interface ProductGridProps extends ProductListProps {
  label: string;
  index?: number;
  title: string;
  viewAll?: CallToAction;
}

/** Rejilla de fichas (2 columnas en móvil, 4 en escritorio), sin cabecera. */
export function ProductList({ products, productHref, intentionOf, ...card }: ProductListProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            href={productHref(product)}
            intention={intentionOf(product)}
            {...card}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGrid({ label, index, title, viewAll, ...list }: ProductGridProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page flex flex-col gap-12 md:gap-16">
        <SectionHeading
          label={label}
          index={index}
          title={title}
          aside={viewAll && <ArrowLink href={viewAll.href}>{viewAll.label}</ArrowLink>}
        />
        <ProductList {...list} />
      </div>
    </section>
  );
}
