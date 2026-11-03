import { type CustomerMeDto, type ProductSummaryDto } from '@antrina/contracts';
import { formatMoney } from '@antrina/ui';
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './AppSheets';

const LOCALE = 'es-PE';

export interface ShopProduct extends ProductSummaryDto {
  image: { src: string; srcSet?: string; sizes?: string } | null;
  path: string;
  url: string;
}

interface ShopData {
  products: ShopProduct[];
  categories: { slug: string; name: string }[];
  children: { slug: string; parentSlug: string | null }[];
  whatsappNumber: string | null;
  contactPath: string;
}

/** Trae lo que ya tiene el cliente para que no tenga que volver a escribirlo en el chat. */
function orderMessage(product: ShopProduct, customer: CustomerMeDto | null): string {
  const lines = [`Hola, me interesa ${product.name}: ${product.url}`];
  if (customer) {
    lines.push(`Soy ${customer.name}.`);
    if (customer.phone) lines.push(`Mi celular: ${customer.phone}`);
    const address = [
      customer.addressLine,
      customer.district,
      customer.city,
      customer.addressReference && `Ref: ${customer.addressReference}`,
    ]
      .filter(Boolean)
      .join(', ');
    if (address) lines.push(`Entrega en: ${address}`);
  }
  return lines.join('\n');
}

function Price({ product }: { product: ShopProduct }) {
  return (
    <span className="shop-price">
      <span>{formatMoney(product.price, LOCALE)}</span>
      {product.compareAtPrice && (
        <s className="shop-price-old">{formatMoney(product.compareAtPrice, LOCALE)}</s>
      )}
    </span>
  );
}

function ProductPhoto({ product }: { product: ShopProduct }) {
  return product.image ? (
    <img
      src={product.image.src}
      srcSet={product.image.srcSet}
      sizes={product.image.sizes}
      alt={product.imageAlt ?? product.name}
      width={640}
      height={800}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="shop-photo-empty">Foto próximamente</span>
  );
}

/** La tienda dentro de la app: elegir y pedir sin salir del mundo. */
export function ShopScreen({
  customer,
  categoryPrefix,
  onCompleteProfile,
}: {
  customer: CustomerMeDto | null;
  /** Llega desde una puerta: abre la parte de la tienda que le corresponde. */
  categoryPrefix: string | null;
  onCompleteProfile: () => void;
}) {
  const [data, setData] = useState<ShopData | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [openProduct, setOpenProduct] = useState<ShopProduct | null>(null);

  useEffect(() => {
    let isActive = true;
    setHasFailed(false);
    fetch('/mundos-api/tienda')
      .then((response) => {
        if (!response.ok) throw new Error('catalog');
        return response.json() as Promise<ShopData>;
      })
      .then((body) => {
        if (!isActive) return;
        setData(body);
        const match = categoryPrefix
          ? body.categories.find((category) => category.slug.startsWith(categoryPrefix))
          : null;
        setChosenSlug(match?.slug ?? null);
      })
      .catch(() => {
        if (isActive) setHasFailed(true);
      });
    return () => {
      isActive = false;
    };
  }, [attempt, categoryPrefix]);

  const chips = useMemo(() => {
    if (!data) return [];
    const parentOf = (slug: string) =>
      data.children.find((child) => child.slug === slug)?.parentSlug ?? slug;
    const used = new Set(data.products.map((product) => parentOf(product.categorySlug)));
    return data.categories.filter((category) => used.has(category.slug));
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    if (!chosenSlug) return data.products;
    const childSlugs = data.children
      .filter((child) => child.parentSlug === chosenSlug)
      .map((child) => child.slug);
    return data.products.filter(
      (product) => product.categorySlug === chosenSlug || childSlugs.includes(product.categorySlug),
    );
  }, [chosenSlug, data]);

  const orderHref =
    openProduct && data
      ? data.whatsappNumber
        ? `https://wa.me/${data.whatsappNumber}?text=${encodeURIComponent(orderMessage(openProduct, customer))}`
        : data.contactPath
      : '';

  return (
    <div className="app-page">
      <header className="app-page-head">
        <h2 className="font-display">Tienda</h2>
        <p>Piezas hechas a mano en nuestro taller de Lima.</p>
      </header>

      {chips.length > 1 && (
        <div className="shop-chips" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={chosenSlug === null ? 'is-active' : undefined}
            aria-pressed={chosenSlug === null}
            onClick={() => setChosenSlug(null)}
          >
            Todo
          </button>
          {chips.map((chip) => (
            <button
              key={chip.slug}
              type="button"
              className={chosenSlug === chip.slug ? 'is-active' : undefined}
              aria-pressed={chosenSlug === chip.slug}
              onClick={() => setChosenSlug(chip.slug)}
            >
              {chip.name}
            </button>
          ))}
        </div>
      )}

      {hasFailed ? (
        <div className="world-card">
          <h3 className="font-display">No pudimos abrir la tienda</h3>
          <p>Revisa tu conexión e inténtalo otra vez.</p>
          <div className="world-card-actions">
            <button
              type="button"
              className="world-primary"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : !data ? (
        <ul className="shop-grid" aria-label="Cargando productos">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="shop-skeleton" />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="world-card">
          <h3 className="font-display">Muy pronto</h3>
          <p>Estamos preparando estas piezas en el taller. Vuelve en unos días.</p>
          {chosenSlug && (
            <div className="world-card-actions">
              <button type="button" className="world-link" onClick={() => setChosenSlug(null)}>
                Ver toda la tienda
              </button>
            </div>
          )}
        </div>
      ) : (
        <ul className="shop-grid">
          {visible.map((product) => (
            <li key={product.id}>
              <button type="button" className="shop-card" onClick={() => setOpenProduct(product)}>
                <span className="shop-photo">
                  <ProductPhoto product={product} />
                </span>
                <span className="shop-card-body">
                  <span className="shop-name">{product.name}</span>
                  <Price product={product} />
                  {!product.isPurchasable && <span className="shop-soldout">Agotado</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openProduct && (
        <Sheet title={openProduct.name} onClose={() => setOpenProduct(null)}>
          <span className="shop-photo shop-photo-large">
            <ProductPhoto product={openProduct} />
          </span>
          <Price product={openProduct} />
          {openProduct.description && <p className="app-sheet-text">{openProduct.description}</p>}
          <a
            className="world-primary world-primary-full"
            href={orderHref}
            target={data?.whatsappNumber ? '_blank' : undefined}
            rel={data?.whatsappNumber ? 'noopener noreferrer' : undefined}
          >
            {!openProduct.isPurchasable
              ? 'Preguntar cuándo vuelve'
              : data?.whatsappNumber
                ? 'Pedir por WhatsApp'
                : 'Hacer mi pedido'}
          </a>
          {customer && !customer.phone && (
            <button type="button" className="app-sheet-link" onClick={onCompleteProfile}>
              Agrega tu celular y dirección para pedir más rápido
            </button>
          )}
          <a className="app-sheet-link" href={openProduct.path}>
            Ver todos los detalles
          </a>
        </Sheet>
      )}
    </div>
  );
}
