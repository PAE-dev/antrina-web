import {
  CUSTOMER_AUTH_ROUTES,
  type CustomerMeDto,
  type ProductSummaryDto,
} from '@antrina/contracts';
import { ButtonLink, formatMoney, GoogleIcon } from '@antrina/ui';
import { useEffect, useMemo, useState } from 'react';
import { type World } from '../bosque/forest-world';
import { Sheet } from './AppSheets';

const LOCALE = 'es-PE';

export interface ShopProduct extends ProductSummaryDto {
  image: { src: string; srcSet?: string; sizes?: string } | null;
  path: string;
  url: string;
}

interface ShopData {
  products: ShopProduct[];
  subcategories: { slug: string; name: string }[];
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

/** Cada mundo vende lo suyo, y solo a quien ya entró con su cuenta. */
export function ShopScreen({
  world,
  customer,
  returnPath,
  onCompleteProfile,
}: {
  world: World;
  customer: CustomerMeDto | null;
  returnPath: string;
  onCompleteProfile: () => void;
}) {
  const [data, setData] = useState<ShopData | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [openProduct, setOpenProduct] = useState<ShopProduct | null>(null);
  const prefix = world.shop?.categoryPrefix ?? '';
  const isSignedIn = customer !== null;

  useEffect(() => {
    if (!isSignedIn) return;
    let isActive = true;
    setHasFailed(false);
    setData(null);
    setChosenSlug(null);
    fetch(`/mundos-api/tienda?categoria=${encodeURIComponent(prefix)}`)
      .then((response) => {
        if (!response.ok) throw new Error('catalog');
        return response.json() as Promise<ShopData>;
      })
      .then((body) => {
        if (isActive) setData(body);
      })
      .catch(() => {
        if (isActive) setHasFailed(true);
      });
    return () => {
      isActive = false;
    };
  }, [attempt, isSignedIn, prefix]);

  const visible = useMemo(() => {
    if (!data) return [];
    return chosenSlug
      ? data.products.filter((product) => product.categorySlug === chosenSlug)
      : data.products;
  }, [chosenSlug, data]);
  const chips = data?.subcategories ?? [];

  if (!customer) {
    return (
      <div className="app-page app-page-narrow">
        <header className="app-page-head">
          <span className="world-card-label">{world.name}</span>
          <h2 className="font-display">Una tienda solo para quienes entran</h2>
          <p>{world.shop?.intro}</p>
        </header>
        <div className="world-card">
          <p>Inicia sesión para ver las piezas de este mundo y hacer tu pedido.</p>
          <ButtonLink
            href={`${CUSTOMER_AUTH_ROUTES.googleStart}?next=${encodeURIComponent(returnPath)}`}
            variant="inverse"
            className="w-full bg-on-dark text-text hover:opacity-90"
          >
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface">
              <GoogleIcon />
            </span>
            Continuar con Google
          </ButtonLink>
        </div>
      </div>
    );
  }

  const orderHref =
    openProduct && data
      ? data.whatsappNumber
        ? `https://wa.me/${data.whatsappNumber}?text=${encodeURIComponent(orderMessage(openProduct, customer))}`
        : data.contactPath
      : '';

  return (
    <div className="app-page">
      <header className="app-page-head">
        <span className="world-card-label">{world.name}</span>
        <h2 className="font-display">Tienda</h2>
        <p>{world.shop?.intro}</p>
      </header>

      {chips.length > 1 && (
        <div className="shop-chips" role="group" aria-label="Filtrar">
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
          <p>Estamos preparando las piezas de este mundo en el taller. Vuelve en unos días.</p>
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
