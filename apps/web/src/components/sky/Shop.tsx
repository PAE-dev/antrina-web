import { type LocaleCode } from '@antrina/contracts';
import { ArrowRightIcon } from '@antrina/ui';
import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';
import { SIGN_CODES, type SignCode } from '../../sky/astrology';
import { SIGN_SKY } from '../../sky/content';
import { type NatalChart } from '../../sky/ephemeris';
import { AREA_STONES, SIGN_STONE, signStone, STONE_LIBRARY } from '../../sky/stones';
import { Sheet, StoneImage } from './parts';

/**
 * Tienda dentro de "Tu cielo": productos y piedras se abren en hojas, sin salir de la app. Solo el
 * pedido (WhatsApp) y la ficha completa abren otra pestaña.
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
  intention: string | null;
  category: string;
  href: string;
  whatsapp: string | null;
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
    zodiac: 'Las 12 piedras de los signos',
    zodiacIntro: 'Cada signo tiene su piedra y su lema. Toca una para conocerla.',
    empty: 'Pronto habrá piezas aquí. Mientras tanto, crea un árbol a tu medida.',
    order: 'Pedir por WhatsApp',
    details: 'Ver ficha completa',
    unavailable: 'Por ahora no está disponible para pedido.',
    withStone: 'Piezas con esta energía',
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
    zodiac: 'The 12 sign stones',
    zodiacIntro: 'Each sign has its stone and motto. Tap one to learn more.',
    empty: 'Pieces are coming soon. Meanwhile, create a tree made for you.',
    order: 'Order on WhatsApp',
    details: 'See full details',
    unavailable: 'Not available to order right now.',
    withStone: 'Pieces with this energy',
    signsOf: 'Stone of',
    close: 'Close',
    createTree: 'Create my tree with my stones',
    disclaimer:
      'Stones are associated with these intentions by tradition; they do not replace medical or professional advice.',
  },
} as const;

/** Productos que encajan con una piedra: por los signos que la llevan y por su intención. */
export function productsForStone(stoneId: string, products: SkyProduct[]): SkyProduct[] {
  const signs = SIGN_CODES.filter((code) => SIGN_STONE[code].stone === stoneId);
  const intentions = (Object.keys(AREA_STONES) as (keyof typeof AREA_STONES)[])
    .filter((area) => AREA_STONES[area].includes(stoneId))
    .map((area) => AREA_INTENTION[area]);
  return products.filter(
    (p) =>
      p.signs.some((s) => signs.includes(s as SignCode)) ||
      (p.intention !== null && intentions.includes(p.intention)),
  );
}

export function ProductTile({
  product,
  onOpen,
  wide = false,
}: {
  product: SkyProduct;
  onOpen: (p: SkyProduct) => void;
  wide?: boolean;
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
    </button>
  );
}

export function ProductSheet({
  locale,
  product,
  onClose,
}: {
  locale: LocaleCode;
  product: SkyProduct | null;
  onClose: () => void;
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
  onClose,
  onProduct,
}: {
  locale: LocaleCode;
  stoneId: string | null;
  signs: SignInfo[];
  products: SkyProduct[];
  onClose: () => void;
  onProduct: (p: SkyProduct) => void;
}) {
  const t = SHOP_UI[locale];
  const stone = stoneId ? STONE_LIBRARY[stoneId] : undefined;
  const ofSigns = stone ? signs.filter((s) => SIGN_STONE[s.code].stone === stone.id) : [];
  const related = useMemo(
    () => (stone ? productsForStone(stone.id, products).slice(0, 8) : []),
    [stone, products],
  );
  return (
    <Sheet open={!!stone} title={stone?.name[locale] ?? ''} onClose={onClose} closeLabel={t.close}>
      {stone && (
        <div className="flex flex-col items-center pb-2 text-center">
          <StoneImage src={stone.image} alt={stone.name[locale]} size={180} glow={stone.color} />
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
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">{stone.meaning[locale]}</p>
          {related.length > 0 && (
            <div className="mt-6 w-full text-left">
              <p className="type-label !text-white/55">{t.withStone}</p>
              <div className="sky-rail -mx-6 mt-3 flex snap-x gap-3 overflow-x-auto px-6 pb-2">
                {related.map((p) => (
                  <ProductTile key={p.id} product={p} onOpen={onProduct} wide />
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
  intentionLabel,
  createTreeHref,
  onProduct,
  onStone,
}: {
  locale: LocaleCode;
  chart: NatalChart;
  signs: SignInfo[];
  products: SkyProduct[];
  intentionLabel: Record<string, string>;
  createTreeHref: string;
  onProduct: (p: SkyProduct) => void;
  onStone: (id: string) => void;
}) {
  const t = SHOP_UI[locale];
  const sun = chart.placements.find((p) => p.point === 'sun')!.sign;
  const moon = chart.placements.find((p) => p.point === 'moon')!.sign;
  const [filter, setFilter] = useState<string | null>(null);

  const forYou = useMemo(() => {
    const bySign = products.filter((p) => p.signs.includes(sun));
    return bySign.length > 0 ? bySign : productsForStone(signStone(sun).id, products);
  }, [products, sun]);
  const intentions = useMemo(
    () => [...new Set(products.map((p) => p.intention).filter((i): i is string => !!i))],
    [products],
  );
  const shown = filter ? products.filter((p) => p.intention === filter) : products;

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
              <ProductTile key={p.id} product={p} onOpen={onProduct} wide />
            ))}
          </div>
        </section>
      )}

      <section>
        {intentions.length > 1 && (
          <div className="sky-rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {[null, ...intentions].map((key) => (
              <button
                key={key ?? 'all'}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
                  filter === key
                    ? 'border-white bg-white text-black'
                    : 'border-white/20 text-white/70 hover:border-white/50'
                }`}
              >
                {key ? (intentionLabel[key] ?? key) : t.all}
              </button>
            ))}
          </div>
        )}
        {shown.length > 0 ? (
          <div key={filter ?? 'all'} className="sky-in mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
            {shown.map((p) => (
              <ProductTile key={p.id} product={p} onOpen={onProduct} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-white/60">{t.empty}</p>
        )}
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
