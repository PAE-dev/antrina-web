import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ELEMENT_OF, type SignCode } from '../../sky/astrology';
import { ELEMENT_COLOR, SIGN_SKY, STONE_HEX } from '../../sky/content';

/** Piezas visuales de "Tu cielo": rueda de selección, hoja inferior, luna, planetas y estrellas. */

export function range(from: number, to: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = from; step > 0 ? v <= to : v >= to; v += step) out.push(v);
  return out;
}

const ITEM = 44;

/** Rueda de selección deslizable (como el selector de fecha del teléfono). */
export function WheelPicker({
  label,
  value,
  options,
  onChange,
  align = 'center',
}: {
  label: string;
  value: number;
  options: [number, string][];
  onChange: (value: number) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const index = Math.max(
    0,
    options.findIndex(([v]) => v === value),
  );

  // Coloca la rueda en el valor actual (sin animación al montar).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM) > 2) el.scrollTop = index * ITEM;
  }, [index, options.length]);

  const onScroll = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      const next = options[i]?.[0];
      if (next !== undefined && next !== value) onChange(next);
    }, 90);
  };

  return (
    <div className="relative" role="group" aria-label={label}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-md bg-on-dark/[0.07]" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="sky-wheel-col relative h-[220px] snap-y snap-mandatory overflow-y-scroll overscroll-contain"
        style={{ paddingBlock: 88 }}
      >
        {options.map(([v, text], i) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
              onChange(v);
            }}
            className={`flex h-11 w-full snap-center items-center px-2 font-display text-[22px] capitalize transition-opacity ${
              align === 'left'
                ? 'justify-start'
                : align === 'right'
                  ? 'justify-end'
                  : 'justify-center'
            } ${v === value ? 'text-on-dark opacity-100' : 'text-on-dark/60 opacity-60'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Hoja inferior para explicaciones ("¿Qué significa?") y ajustes. */
export function Sheet({
  open,
  title,
  onClose,
  closeLabel,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Se monta en la raíz de la app: un padre animado (transform) rompería el "fixed".
  const host = document.querySelector('.sky-root') ?? document.body;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center text-on-dark"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="sky-sheet relative max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-t-xl border border-on-dark/15 bg-[#0e0e10] px-6 pt-5 pb-10">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-on-dark/25" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-[24px] leading-tight font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[14px] text-on-dark-muted underline underline-offset-4"
          >
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>,
    host,
  );
}

/** Botón "¿Qué significa?" junto a cada término. */
export function InfoButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="inline-flex items-center gap-1.5 rounded-full border border-on-dark/20 px-2.5 py-1 text-[12px] text-on-dark-muted transition-colors hover:border-on-dark/50 hover:text-on-dark"
    >
      <span className="flex size-4 items-center justify-center rounded-full border border-current text-[10px]">
        ?
      </span>
      {label}
    </button>
  );
}

export function Glyph({
  code,
  size = 'md',
  dim = false,
}: {
  code: SignCode;
  size?: 'sm' | 'md' | 'lg';
  dim?: boolean;
}) {
  const color = ELEMENT_COLOR[ELEMENT_OF[code]];
  const cls =
    size === 'lg'
      ? 'size-20 text-[38px]'
      : size === 'sm'
        ? 'size-9 text-[17px]'
        : 'size-14 text-[26px]';
  return (
    <span
      className={`sky-symbol flex shrink-0 items-center justify-center rounded-full border ${cls}`}
      style={{ borderColor: `${color}88`, color, boxShadow: dim ? 'none' : `0 0 28px ${color}33` }}
      aria-hidden="true"
    >
      {SIGN_SKY[code].glyph}
    </span>
  );
}

export function Swatch({ id, size = 24 }: { id: string; size?: number }) {
  return (
    <span
      className="sky-gem inline-block shrink-0 rotate-45 rounded-[4px]"
      style={{ backgroundColor: STONE_HEX[id] ?? '#ddd', width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md border border-on-dark/15 bg-on-dark/[0.035] p-5 backdrop-blur-[2px] md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/** Luna (o sol) granulada con halo, generada con un filtro SVG (sin fotos). */
export function GrainOrb({
  size = 220,
  phase,
  className = '',
}: {
  size?: number;
  phase?: { illumination: number; waxing: boolean };
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const shadow = phase ? (1 - phase.illumination) * 2 - 1 : -1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1.3 -1.3 2.6 2.6"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={`g${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="2.6"
            numOctaves="3"
            seed="7"
            result="n"
          />
          <feColorMatrix type="saturate" values="0" in="n" result="ng" />
          <feComposite in="ng" in2="SourceGraphic" operator="in" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
        <filter id={`h${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="0.12" />
        </filter>
        {phase && (
          <clipPath id={`c${id}`}>
            <circle r="1" />
          </clipPath>
        )}
      </defs>
      <circle r="1.04" fill="#f3ecdf" opacity="0.35" filter={`url(#h${id})`} />
      <circle r="1" fill="#efe8dc" filter={`url(#g${id})`} />
      {phase && (
        <path
          clipPath={`url(#c${id})`}
          d={`M 0 -1 A 1 1 0 0 ${phase.waxing ? 0 : 1} 0 1 A ${Math.abs(shadow)} 1 0 0 ${shadow > 0 === phase.waxing ? 0 : 1} 0 -1`}
          fill="#000"
          opacity="0.9"
        />
      )}
    </svg>
  );
}

/** Planetas del día alrededor de la Tierra, girando despacio (pantalla de "pensando"). */
export function PlanetsDance({
  longitudes,
}: {
  longitudes: { id: string; lon: number; r: number; size: number; color: string }[];
}) {
  return (
    <svg
      viewBox="-100 -100 200 200"
      className="sky-dance h-[60vmin] max-h-[420px] w-full"
      aria-hidden="true"
    >
      {[30, 48, 66, 84].map((r) => (
        <circle key={r} r={r} fill="none" stroke="#f3ecdf" strokeOpacity="0.08" strokeWidth="0.4" />
      ))}
      <circle r="9" fill="#5b7fb0" />
      <circle r="9" fill="none" stroke="#f3ecdf" strokeOpacity="0.4" strokeWidth="0.6" />
      {longitudes.map((p, i) => {
        const a = (-p.lon * Math.PI) / 180;
        return (
          <g key={p.id} className="sky-orbit-ring" style={{ animationDuration: `${18 + i * 6}s` }}>
            <circle cx={Math.cos(a) * p.r} cy={Math.sin(a) * p.r} r={p.size} fill={p.color} />
          </g>
        );
      })}
    </svg>
  );
}

/** Cielo de estrellas que titilan y se desplazan muy despacio. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const stars = Array.from({ length: 240 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.4,
    }));
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = (time: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        const twinkle = reduce
          ? 0.7
          : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.001 * star.s + star.p));
        const y = ((star.y + (reduce ? 0 : time * 0.0000035 * star.s)) % 1) * h;
        ctx.globalAlpha = twinkle * 0.85;
        ctx.fillStyle = '#f3ecdf';
        ctx.beginPath();
        ctx.arc(star.x * w, y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const SKY_CSS = `
.sky-root { background: #000; }
.sky-bond-spin { animation: sky-bond-spin 3s cubic-bezier(.55,0,.35,1) both; }
@keyframes sky-bond-spin { from { transform: rotate(0); } to { transform: rotate(720deg); } }
.sky-bond-l { animation: sky-bond-l 3s cubic-bezier(.55,0,.35,1) both; }
.sky-bond-r { animation: sky-bond-r 3s cubic-bezier(.55,0,.35,1) both; }
@keyframes sky-bond-l { from { transform: translateX(-90px); } 80% { transform: translateX(-22px); } to { transform: translateX(-4px) scale(.9); } }
@keyframes sky-bond-r { from { transform: translateX(90px); } 80% { transform: translateX(22px); } to { transform: translateX(4px) scale(.9); } }
.sky-bond-glow { animation: sky-bond-glow 3s ease-in both; }
@keyframes sky-bond-glow { from { opacity: .1; transform: scale(.6); } to { opacity: .75; transform: scale(1.5); } }
.sky-bond-flash { opacity: 0; animation: sky-bond-flash .9s 2.2s ease-out both; }
@keyframes sky-bond-flash { from { opacity: .9; transform: scale(.4); } to { opacity: 0; transform: scale(2.6); } }
.sky-bar { width: 0; animation: sky-bar 1s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes sky-bar { to { width: var(--w); } }
@media (prefers-reduced-motion: reduce) { .sky-bond-spin, .sky-bond-l, .sky-bond-r, .sky-bond-glow, .sky-bond-flash { animation: none; } .sky-bar { animation-duration: .01s; } }
.sky-glass { background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.sky-check { animation: sky-check-pop .45s cubic-bezier(.34,1.56,.5,1) both; }
@keyframes sky-check-pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.sky-check-path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: sky-check-draw .4s .15s ease-out forwards; }
@keyframes sky-check-draw { to { stroke-dashoffset: 0; } }
.sky-rank-row { opacity: 0; animation: sky-rank-in .5s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes sky-rank-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
.sky-rank-first { box-shadow: 0 0 0 1px rgba(255,214,120,.5), 0 0 28px rgba(255,200,90,.25); }
.sky-crystal-idle { animation: sky-float 4s ease-in-out infinite; }
@keyframes sky-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.sky-crystal-glow { background: radial-gradient(circle, rgba(190,225,255,.35), transparent 70%); filter: blur(10px); animation: sky-pulse 3s ease-in-out infinite; }
@keyframes sky-pulse { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
.sky-half-l { clip-path: polygon(0 0, 54% 0, 46% 35%, 56% 62%, 47% 100%, 0 100%); }
.sky-half-r { clip-path: polygon(54% 0, 100% 0, 100% 100%, 47% 100%, 56% 62%, 46% 35%); }
.sky-crack { animation: sky-shake .45s ease-in-out; }
@keyframes sky-shake { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-4deg); } 40% { transform: rotate(4deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(2deg); } }
.sky-crack .sky-half-l { animation: sky-split-l .8s .45s cubic-bezier(.3,.7,.3,1) forwards; }
.sky-crack .sky-half-r { animation: sky-split-r .8s .45s cubic-bezier(.3,.7,.3,1) forwards; }
@keyframes sky-split-l { to { transform: translate(-46px, 10px) rotate(-14deg); opacity: 0; } }
@keyframes sky-split-r { to { transform: translate(46px, 10px) rotate(14deg); opacity: 0; } }
.sky-flash { background: radial-gradient(circle, rgba(255,255,255,.95), rgba(190,225,255,.4) 35%, transparent 70%); opacity: 0; animation: sky-flash .7s .5s ease-out forwards; }
@keyframes sky-flash { 0% { opacity: 0; transform: scale(.3); } 40% { opacity: 1; } 100% { opacity: 0; transform: scale(1.6); } }
.sky-paper { transform-origin: top center; animation: sky-unroll .8s cubic-bezier(.2,.8,.2,1) both; }
@keyframes sky-unroll { from { opacity: 0; transform: perspective(600px) rotateX(-75deg) scaleY(.2); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .sky-check, .sky-check-path, .sky-rank-row, .sky-crystal-idle, .sky-crack, .sky-crack .sky-half-l, .sky-crack .sky-half-r, .sky-flash, .sky-paper { animation-duration: .01s; animation-delay: 0s; } }
.sky-rail { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.sky-rail::-webkit-scrollbar { display: none; }
.sky-dock { background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.05)); -webkit-backdrop-filter: blur(22px) saturate(170%); backdrop-filter: blur(22px) saturate(170%); box-shadow: 0 18px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 0 rgba(255,255,255,.06); }
.sky-drop { transition: transform .55s cubic-bezier(.34,1.45,.5,1); }
.sky-drop > span { background: radial-gradient(120% 140% at 50% 0%, rgba(255,255,255,.34), rgba(255,255,255,.12) 60%, rgba(255,255,255,.08)); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 12px rgba(255,255,255,.06), 0 4px 14px rgba(0,0,0,.35); animation: sky-goo .55s cubic-bezier(.3,.7,.3,1); }
@keyframes sky-goo { 0% { transform: scale(1,1); } 30% { transform: scale(1.32,.84); } 60% { transform: scale(.94,1.06); } 100% { transform: scale(1,1); } }
.sky-tab-icon { transition: transform .35s cubic-bezier(.34,1.56,.5,1); }
.sky-tab[aria-current="page"] .sky-tab-icon { transform: translateY(-1px) scale(1.08); }
.sky-in { animation: sky-in 0.6s cubic-bezier(.2,.7,.2,1) both; }
@keyframes sky-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.sky-fade { animation: sky-fade 1.1s ease both; }
@keyframes sky-fade { from { opacity: 0; } to { opacity: 1; } }
.sky-sheet { animation: sky-up 0.35s cubic-bezier(.2,.7,.2,1) both; }
@keyframes sky-up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
.sky-orbit-ring { transform-origin: 0 0; animation: sky-spin-r 24s linear infinite; }
@keyframes sky-spin-r { to { transform: rotate(-360deg); } }
.sky-rise { animation: sky-rise 1.6s cubic-bezier(.2,.7,.2,1) both; }
@keyframes sky-rise { from { transform: translateY(-40px) scale(.9); opacity: 0; } to { transform: none; opacity: 1; } }
.sky-orbit-spin { animation: sky-spin-r 20s linear infinite; }
.sky-stone { filter: drop-shadow(0 14px 22px rgba(0,0,0,.45)); }
.sky-symbol { font-family: 'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Apple Symbols', serif; }
.sky-gem { box-shadow: inset -3px -3px 6px rgba(0,0,0,.25), inset 2px 2px 4px rgba(255,255,255,.35); }
.sky-wheel-col { scrollbar-width: none; -webkit-mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent); mask-image: linear-gradient(transparent, #000 30%, #000 70%, transparent); }
.sky-wheel-col::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .sky-in, .sky-fade, .sky-sheet, .sky-orbit-ring, .sky-rise { animation: none; } }
`;

/** Foto de una piedra (recortada, con sombra suave y halo de su color). */
export function StoneImage({
  src,
  alt,
  size,
  glow,
  className = '',
}: {
  src: string;
  alt: string;
  size: number;
  glow?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          className="absolute inset-[18%] rounded-full blur-2xl"
          style={{ backgroundColor: glow, opacity: 0.28 }}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="sky-stone relative max-h-full max-w-full object-contain"
      />
    </span>
  );
}
