import { type LocaleCode, PRODUCT_STONES, stoneName } from '@antrina/contracts';
import { ArrowRightIcon } from '@antrina/ui';
import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import {
  AREA_STONES,
  type NatalChart,
  SIGN_CODES,
  SIGN_SKY,
  SIGN_STONE,
  type SignCode,
  signStone,
  STONE_HEX,
  STONE_LIBRARY,
} from '@antrina/sky';
import { Sheet, StoneImage } from './parts';

/**
 * Tienda dentro de "Tu cielo": productos y piedras se abren en hojas, sin salir de la app. Solo el
 * pedido (WhatsApp) y la ficha completa abren otra pestaña. Las piedras de cada pieza vienen del panel
 * (`Product.stones`); si una pieza aún no las tiene cargadas, se busca por su intención y signos.
 */

export interface SkyProduct {
  id: string;
  name: string;
  description: string;
  image: string | null;
  imageAlt: string;
  price: string;
  compareAt: string | null;
  signs: string[];
  /** Ids del catálogo de piedras (`PRODUCT_STONES`). */
  stones: string[];
  intention: string | null;
  category: string;
  href: string;
  whatsapp: string | null;
}

/** Piedra de la tienda con su página de significado (si la tiene). */
export interface ShopStoneInfo {
  id: string;
  name: string;
  summary: string;
  href: string;
}

interface SignInfo {
  code: SignCode;
  label: string;
  dates: string;
}

const AREA_INTENTION: Record<keyof typeof AREA_STONES, string> = {
  love: 'amor',
  money: 'abundancia',
  work: 'proteccion',
  luck: 'suerte',
};

const SHOP_UI = {
  es: {
    title: 'Tienda',
    intro: 'Árboles y piezas hechas a mano en nuestro taller de Lima, elegidos para tu cielo.',
    forYou: 'Para tu signo',
    yourStones: 'Tus piedras',
    sun: 'Sol',
    moon: 'Luna',
    rising: 'Ascendente',
    all: 'Todo',
    by: { intention: 'Intención', stone: 'Piedra', category: 'Categoría' },
    explore: 'Explora por piedra',
    exploreIntro: 'Toca una piedra para conocerla y ver las piezas que la llevan.',
    pieces: (n: number) => (n === 1 ? '1 pieza' : `${n} piezas`),
    zodiac: 'Las 12 piedras de los signos',
    zodiacIntro: 'Cada signo tiene su piedra y su lema. Toca una para conocerla.',
    empty: 'Pronto habrá piezas aquí. Mientras tanto, crea un árbol a tu medida.',
    noMatch: 'Aún no hay piezas con este filtro.',
    order: 'Pedir por WhatsApp',
    details: 'Ver ficha completa',
    unavailable: 'Por ahora no está disponible para pedido.',
    itsStones: 'Piedras de esta pieza',
    withStone: (name: string) => `Piezas con ${name}`,
    affine: 'Piezas con esta energía',
    meaning: 'Significado completo',
    signsOf: 'Piedra de',
    close: 'Cerrar',
    createTree: 'Crear mi árbol con mis piedras',
    disclaimer:
      'Las piedras se asocian con estas intenciones por tradición; no reemplazan consejo médico ni profesional.',
  },
  en: {
    title: 'Shop',
    intro: 'Handmade trees and pieces from our Lima workshop, chosen for your sky.',
    forYou: 'For your sign',
    yourStones: 'Your stones',
    sun: 'Sun',
    moon: 'Moon',
    rising: 'Rising',
    all: 'All',
    by: { intention: 'Intention', stone: 'Stone', category: 'Category' },
    explore: 'Explore by stone',
    exploreIntro: 'Tap a stone to learn about it and see the pieces that carry it.',
    pieces: (n: number) => (n === 1 ? '1 piece' : `${n} pieces`),
    zodiac: 'The 12 sign stones',
    zodiacIntro: 'Each sign has its stone and motto. Tap one to learn more.',
    empty: 'Pieces are coming soon. Meanwhile, create a tree made for you.',
    noMatch: 'No pieces with this filter yet.',
    order: 'Order on WhatsApp',
    details: 'See full details',
    unavailable: 'Not available to order right now.',
    itsStones: 'Stones in this piece',
    withStone: (name: string) => `Pieces with ${name}`,
    affine: 'Pieces with this energy',
    meaning: 'Full meaning',
    signsOf: 'Stone of',
    close: 'Close',
    createTree: 'Create my tree with my stones',
    disclaimer:
      'Stones are associated with these intentions by tradition; they do not replace medical or professional advice.',
  },
} as const;

type FilterKind = 'intention' | 'stone' | 'category';

/** Nombre, significado e imagen de una piedra, venga de "Tu cielo" o de la tienda. */
function stoneInfo(id: string, locale: LocaleCode, shop: Map<string, ShopStoneInfo>) {
  const sky = STONE_LIBRARY[id];
  const page = shop.get(id);
  return {
    id,
    name: sky?.name[locale] ?? page?.name ?? stoneName(id, locale),
    meaning: sky?.meaning[locale] ?? page?.summary ?? '',
    image: sky?.image ?? null,
    color: sky?.color ?? STONE_HEX[id] ?? '#d8d2c6',
    href: page?.href ?? null,
  };
}

/** Foto de la piedra o, si no tiene, una gema de su color. */
export function StoneVisual({
  id,
  size,
  glow = true,
}: {
  id: string;
  size: number;
  glow?: boolean;
}) {
  const sky = STONE_LIBRARY[id];
  if (sky)
    return <StoneImage src={sky.image} alt="" size={size} glow={glow ? sky.color : undefined} />;
  const color = STONE_HEX[id] ?? '#d8d2c6';
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span
        className="sky-gem rotate-45 rounded-[22%]"
        style={{ width: size * 0.5, height: size * 0.5, backgroundColor: color }}
        aria-hidden="true"
      />
    </span>
  );
}

/** Piezas de una piedra: primero las que la llevan (panel); si ninguna, las afines por tradición. */
export function productsForStone(
  stoneId: string,
  products: SkyProduct[],
): { exact: SkyProduct[]; affine: SkyProduct[] } {
  const exact = products.filter((p) => p.stones.includes(stoneId));
  if (exact.length > 0) return { exact, affine: [] };
  const signs = SIGN_CODES.filter((code) => SIGN_STONE[code].stone === stoneId);
  const intentions = (Object.keys(AREA_STONES) as (keyof typeof AREA_STONES)[])
    .filter((area) => AREA_STONES[area].includes(stoneId))
    .map((area) => AREA_INTENTION[area]);
  const affine = products.filter(
    (p) =>
      p.signs.some((s) => signs.includes(s as SignCode)) ||
      (p.intention !== null && intentions.includes(p.intention)),
  );
  return { exact: [], affine };
}

function StoneChips({
  ids,
  locale,
  shop,
  onStone,
  size = 'md',
}: {
  ids: string[];
  locale: LocaleCode;
  shop: Map<string, ShopStoneInfo>;
  onStone?: (id: string) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const label = stoneInfo(id, locale, shop).name;
        const content = (
          <>
            <StoneVisual id={id} size={size === 'sm' ? 18 : 26} glow={false} />
            <span>{label}</span>
          </>
        );
        const cls = `inline-flex items-center gap-1 rounded-full border border-white/12 pr-2.5 ${
          size === 'sm' ? 'py-0 pl-0.5 text-[11px] text-white/70' : 'py-0.5 pl-1 text-[13px]'
        }`;
        return onStone ? (
          <button
            key={id}
            type="button"
            onClick={() => onStone(id)}
            className={`${cls} hover:border-white/40`}
          >
            {content}
          </button>
        ) : (
          <span key={id} className={cls}>
            {content}
          </span>
        );
      })}
    </span>
  );
}

export function ProductTile({
  product,
  onOpen,
  wide = false,
  locale,
  shop,
}: {
  product: SkyProduct;
  onOpen: (p: SkyProduct) => void;
  wide?: boolean;
  locale: LocaleCode;
  shop: Map<string, ShopStoneInfo>;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`group flex flex-col text-left ${wide ? 'w-[46vw] max-w-[200px] shrink-0 snap-start' : ''}`}
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-white/[0.06]">
        {product.image ? (
          <img
            src={product.image}
            alt={product.imageAlt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-3 text-center text-[12px] text-white/45">
            {product.name}
          </span>
        )}
      </span>
      <span className="mt-2 line-clamp-2 text-[14px] leading-snug font-medium">{product.name}</span>
      <span className="mt-0.5 flex items-baseline gap-2 text-[13px] tabular-nums">
        <span>{product.price}</span>
        {product.compareAt && (
          <span className="text-white/40 line-through">{product.compareAt}</span>
        )}
      </span>
      {product.stones.length > 0 && (
        <span className="mt-1.5">
          <StoneChips ids={product.stones.slice(0, 3)} locale={locale} shop={shop} size="sm" />
        </span>
      )}
    </button>
  );
}

export function ProductSheet({
  locale,
  product,
  shop,
  onClose,
  onStone,
}: {
  locale: LocaleCode;
  product: SkyProduct | null;
  shop: Map<string, ShopStoneInfo>;
  onClose: () => void;
  onStone: (id: string) => void;
}) {
  const t = SHOP_UI[locale];
  return (
    <Sheet
      open={product !== null}
      title={product?.name ?? ''}
      onClose={onClose}
      closeLabel={t.close}
    >
      {product && (
        <div className="flex flex-col gap-4 pb-2">
          {product.image && (
            <img
              src={product.image}
              alt={product.imageAlt}
              className="aspect-[4/5] w-full rounded-md bg-white/[0.06] object-cover"
            />
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="type-label !text-white/55">{product.category}</span>
            <span className="flex items-baseline gap-2 text-[18px] font-medium tabular-nums">
              {product.compareAt && (
                <span className="text-[14px] text-white/40 line-through">{product.compareAt}</span>
              )}
              {product.price}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-white/80">{product.description}</p>
          {product.stones.length > 0 && (
            <div>
              <p className="type-label mb-2 !text-white/55">{t.itsStones}</p>
              <StoneChips
                ids={product.stones}
                locale={locale}
                shop={shop}
                onStone={(id) => {
                  onClose();
                  onStone(id);
                }}
              />
            </div>
          )}
          {product.signs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.signs.map((code) => (
                <span
                  key={code}
                  className="sky-symbol rounded-full border border-white/15 px-3 py-1 text-[13px] text-white/80"
                >
                  {SIGN_SKY[code as SignCode]?.glyph}
                </span>
              ))}
            </div>
          )}
          {product.whatsapp ? (
            <Button
              onPress={() => window.open(product.whatsapp!, '_blank', 'noopener')}
              size="lg"
              className="h-12 w-full bg-white text-[15px] text-black"
            >
              {t.order}
            </Button>
          ) : (
            <p className="text-[13px] text-white/50">{t.unavailable}</p>
          )}
          <a
            href={product.href}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 text-[14px] text-white/70 underline underline-offset-4"
          >
            {t.details} <ArrowRightIcon />
          </a>
        </div>
      )}
    </Sheet>
  );
}

export function StoneSheet({
  locale,
  stoneId,
  signs,
  products,
  shop,
  onClose,
  onProduct,
}: {
  locale: LocaleCode;
  stoneId: string | null;
  signs: SignInfo[];
  products: SkyProduct[];
  shop: Map<string, ShopStoneInfo>;
  onClose: () => void;
  onProduct: (p: SkyProduct) => void;
}) {
  const t = SHOP_UI[locale];
  const stone = stoneId ? stoneInfo(stoneId, locale, shop) : null;
  const ofSigns = stone ? signs.filter((s) => SIGN_STONE[s.code].stone === stone.id) : [];
  const related = useMemo(
    () => (stoneId ? productsForStone(stoneId, products) : { exact: [], affine: [] }),
    [stoneId, products],
  );
  const list = related.exact.length > 0 ? related.exact : related.affine.slice(0, 8);
  return (
    <Sheet open={!!stone} title={stone?.name ?? ''} onClose={onClose} closeLabel={t.close}>
      {stone && (
        <div className="flex flex-col items-center pb-2 text-center">
          <StoneVisual id={stone.id} size={170} />
          {ofSigns.map((s) => (
            <p key={s.code} className="mt-3">
              <span className="type-label !text-white/55">
                {t.signsOf} {s.label} · {s.dates}
              </span>
              <span className="font-display mt-1 block text-[20px] text-white/85">
                “{SIGN_STONE[s.code].motto[locale]}”
              </span>
            </p>
          ))}
          {stone.meaning && (
            <p className="mt-4 text-[15px] leading-relaxed text-white/80">{stone.meaning}</p>
          )}
          {stone.href && (
            <a
              href={stone.href}
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex items-center gap-2 text-[14px] text-white/70 underline underline-offset-4"
            >
              {t.meaning} <ArrowRightIcon />
            </a>
          )}
          {list.length > 0 && (
            <div className="mt-6 w-full text-left">
              <p className="type-label !text-white/55">
                {related.exact.length > 0 ? t.withStone(stone.name) : t.affine}
              </p>
              <div className="sky-rail -mx-6 mt-3 flex snap-x gap-3 overflow-x-auto px-6 pb-2">
                {list.map((p) => (
                  <ProductTile
                    key={p.id}
                    product={p}
                    onOpen={(product) => {
                      onClose();
                      onProduct(product);
                    }}
                    wide
                    locale={locale}
                    shop={shop}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function ShopTab({
  locale,
  chart,
  signs,
  products,
  shop,
  intentionLabel,
  createTreeHref,
  onProduct,
  onStone,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  signs: SignInfo[];
  products: SkyProduct[];
  shop: Map<string, ShopStoneInfo>;
  intentionLabel: Record<string, string>;
  createTreeHref: string;
  onProduct: (p: SkyProduct) => void;
  onStone: (id: string) => void;
}) {
  const t = SHOP_UI[locale];
  const sun = chart.placements.find((p) => p.point === 'sun')!.sign;
  const moon = chart.placements.find((p) => p.point === 'moon')!.sign;
  const [kind, setKind] = useState<FilterKind>('intention');
  const [value, setValue] = useState<string | null>(null);

  const forYou = useMemo(() => {
    const bySign = products.filter((p) => p.signs.includes(sun));
    if (bySign.length > 0) return bySign;
    const { exact, affine } = productsForStone(signStone(sun).id, products);
    return exact.length > 0 ? exact : affine;
  }, [products, sun]);

  /** Piedras presentes en el catálogo, con cuántas piezas las llevan. */
  const stoneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) for (const id of p.stones) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [products]);

  const options = useMemo((): [string, string][] => {
    if (kind === 'intention') {
      return [...new Set(products.map((p) => p.intention).filter((i): i is string => !!i))].map(
        (key) => [key, intentionLabel[key] ?? key],
      );
    }
    if (kind === 'category') {
      return [...new Set(products.map((p) => p.category))].map((name) => [name, name]);
    }
    return PRODUCT_STONES.filter((s) => stoneCounts.has(s.id)).map((s) => [s.id, s.name[locale]]);
  }, [kind, products, intentionLabel, stoneCounts, locale]);

  const shown = products.filter((p) => {
    if (!value) return true;
    if (kind === 'intention') return p.intention === value;
    if (kind === 'category') return p.category === value;
    return p.stones.includes(value);
  });

  // Explorar: primero las piedras que llevan las piezas; luego las del zodiaco con foto.
  const exploreIds = useMemo(() => {
    const inProducts = PRODUCT_STONES.map((s) => s.id).filter((id) => stoneCounts.has(id));
    const withPhoto = Object.keys(STONE_LIBRARY).filter((id) => !stoneCounts.has(id));
    return [...inProducts, ...withPhoto];
  }, [stoneCounts]);

  const mine: [string, SignCode][] = [
    [t.sun, sun],
    [t.moon, moon],
  ];
  if (chart.ascendant) mine.push([t.rising, chart.ascendant.sign]);

  return (
    <>
      <header>
        <h1 className="font-display text-[32px] font-semibold">{t.title}</h1>
        <p className="mt-1 text-[15px] text-white/60">{t.intro}</p>
      </header>

      <section>
        <p className="type-label !text-white/55">{t.yourStones}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {mine.map(([label, code]) => {
            const stone = signStone(code);
            return (
              <button
                key={label}
                type="button"
                onClick={() => onStone(stone.id)}
                className="flex flex-col items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-3 transition-colors hover:border-white/30"
              >
                <StoneImage src={stone.image} alt="" size={64} glow={stone.color} />
                <span className="text-[13px] font-medium">{stone.name[locale]}</span>
                <span className="text-[11px] text-white/50">
                  {label} · {signs.find((s) => s.code === code)?.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {forYou.length > 0 && (
        <section>
          <p className="type-label !text-white/55">
            {t.forYou} · {signs.find((s) => s.code === sun)?.label}
          </p>
          <div className="sky-rail -mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {forYou.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onOpen={onProduct}
                wide
                locale={locale}
                shop={shop}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        {/* Filtro: primero qué mirar (intención, piedra o categoría), luego el valor. */}
        <div className="flex rounded-full border border-white/12 p-1">
          {(['intention', 'stone', 'category'] as FilterKind[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setKind(key);
                setValue(null);
              }}
              className={`flex-1 rounded-full py-1.5 text-[13px] transition-colors ${
                kind === key ? 'bg-white text-black' : 'text-white/65 hover:text-white'
              }`}
            >
              {t.by[key]}
            </button>
          ))}
        </div>
        {options.length > 0 && (
          <div className="sky-rail -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {[null, ...options.map(([key]) => key)].map((key) => {
              const label = key ? options.find(([k]) => k === key)![1] : t.all;
              return (
                <button
                  key={key ?? 'all'}
                  type="button"
                  onClick={() => setValue(key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3.5 text-[13px] transition-colors ${
                    kind === 'stone' && key ? 'pl-1' : 'pl-3.5'
                  } ${
                    value === key
                      ? 'border-white bg-white text-black'
                      : 'border-white/20 text-white/70 hover:border-white/50'
                  }`}
                >
                  {kind === 'stone' && key && <StoneVisual id={key} size={22} glow={false} />}
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {products.length === 0 ? (
          <p className="mt-4 text-[15px] text-white/60">{t.empty}</p>
        ) : shown.length > 0 ? (
          <div
            key={`${kind}-${value ?? 'all'}`}
            className="sky-in mt-4 grid grid-cols-2 gap-x-3 gap-y-5"
          >
            {shown.map((p) => (
              <ProductTile key={p.id} product={p} onOpen={onProduct} locale={locale} shop={shop} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-white/60">{t.noMatch}</p>
        )}
      </section>

      <section className="mt-2">
        <h2 className="font-display text-[24px] font-semibold">{t.explore}</h2>
        <p className="mt-1 text-[14px] text-white/60">{t.exploreIntro}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {exploreIds.map((id) => {
            const info = stoneInfo(id, locale, shop);
            const count = stoneCounts.get(id) ?? 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onStone(id)}
                className="flex flex-col items-center gap-1 rounded-md border border-white/10 px-2 py-3 text-center transition-colors hover:border-white/30"
              >
                <StoneVisual id={id} size={56} />
                <span className="text-[13px] leading-tight font-medium">{info.name}</span>
                {count > 0 && <span className="text-[11px] text-white/50">{t.pieces(count)}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-2">
        <h2 className="font-display text-[24px] font-semibold">{t.zodiac}</h2>
        <p className="mt-1 text-[14px] text-white/60">{t.zodiacIntro}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {SIGN_CODES.map((code) => {
            const stone = signStone(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => onStone(stone.id)}
                className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-center transition-colors ${
                  code === sun
                    ? 'border-[var(--accent)] bg-white/[0.05]'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <StoneImage src={stone.image} alt="" size={56} glow={stone.color} />
                <span className="text-[13px] leading-tight font-medium">
                  {signs.find((s) => s.code === code)?.label}
                </span>
                <span className="text-[11px] leading-tight text-white/50">
                  {stone.name[locale]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Button
        onPress={() => window.open(createTreeHref, '_blank', 'noopener')}
        size="lg"
        className="mt-2 h-12 w-full bg-white text-[15px] text-black"
      >
        {t.createTree}
        <ArrowRightIcon />
      </Button>
      <p className="text-[12px] leading-relaxed text-white/45">{t.disclaimer}</p>
    </>
  );
}
