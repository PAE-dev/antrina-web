import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { loadToritoAssets, TORITO_VIEW, ToritoRenderer } from './torito-renderer';
import { type OwnedTorito } from './toritos';

const GREET_COOLDOWN_MS = 2600;
const BUBBLE_MS = 2800;
const GREET_ON_START_MS = 850;

export type BubbleAlign = 'start' | 'center' | 'end';

const BUBBLE_POSITION: Record<BubbleAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

/** Un torito recortado y vivo. Saluda al pasar el cursor por encima o al tocarlo. */
export function ToritoSprite({
  torito,
  assetsPath,
  greets = true,
  showBubble = true,
  greetsOnStart = false,
  bubbleAlign = 'center',
  isPaused = false,
  onSelect,
}: {
  torito: OwnedTorito;
  assetsPath: string;
  greets?: boolean;
  showBubble?: boolean;
  /** Saluda en cuanto aparece, sin esperar al cursor. */
  greetsOnStart?: boolean;
  /** Fuera de la vista no se anima. */
  isPaused?: boolean;
  /** Al tocar al torito. */
  onSelect?: () => void;
  /** Hacia dónde se abre el globo, para que no se salga en los corrales de los lados. */
  bubbleAlign?: BubbleAlign;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ToritoRenderer | null>(null);
  const lastGreetRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const bubbleTimerRef = useRef(0);
  const [isBubbleOpen, setBubbleOpen] = useState(false);
  const [hasFailed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const particles = particlesRef.current;
    if (!canvas || !particles) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: ToritoRenderer | null = null;
    let isActive = true;
    const observer = new ResizeObserver(() => renderer?.resize());

    loadToritoAssets(assetsPath)
      .then((assets) => {
        if (!isActive) return;
        renderer = new ToritoRenderer(
          canvas,
          particles,
          assets,
          torito.personality.temperament,
          reducedMotion,
          { sprite: true, view: TORITO_VIEW, color: torito.color.rgb },
        );
        renderer.onContextLost = () => setFailed(true);
        rendererRef.current = renderer;
        renderer.setPaused(isPausedRef.current);
        observer.observe(canvas);
        renderer.start();
        if (greetsOnStart) {
          bubbleTimerRef.current = window.setTimeout(() => renderer?.greet(), GREET_ON_START_MS);
        }
      })
      .catch(() => {
        if (isActive) setFailed(true);
      });

    return () => {
      isActive = false;
      observer.disconnect();
      renderer?.destroy();
      renderer?.release();
      rendererRef.current = null;
      window.clearTimeout(bubbleTimerRef.current);
    };
  }, [assetsPath, torito.personality, torito.color, greetsOnStart]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    rendererRef.current?.setPaused(isPaused);
  }, [isPaused]);

  const position = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const greet = (force: boolean) => {
    const now = performance.now();
    if (!force && now - lastGreetRef.current < GREET_COOLDOWN_MS) return;
    lastGreetRef.current = now;
    rendererRef.current?.greet();
    if (!showBubble) return;
    setBubbleOpen(true);
    window.clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => setBubbleOpen(false), BUBBLE_MS);
  };

  return (
    <div
      className="relative size-full touch-manipulation select-none rounded-md outline-offset-2 outline-surface has-[button:focus-visible]:outline-2"
      onPointerMove={(event) => {
        const { x, y } = position(event);
        rendererRef.current?.pointerAt(x, y);
        if (greets && rendererRef.current?.isOverTorito(x, y)) greet(false);
      }}
      onPointerDown={(event) => {
        const { x, y } = position(event);
        if (greets && !onSelect && rendererRef.current?.isOverTorito(x, y)) greet(true);
      }}
      onClick={(event) => {
        const { x, y } = position(event);
        if (onSelect && rendererRef.current?.isOverTorito(x, y)) {
          setBubbleOpen(false);
          onSelect();
        }
      }}
    >
      {onSelect && (
        <button
          type="button"
          className="sr-only"
          aria-label={`Visitar a ${torito.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setBubbleOpen(false);
            onSelect();
          }}
        />
      )}
      {hasFailed ? (
        <img src={`${assetsPath}/silueta.webp`} alt="" className="absolute inset-0 size-full" />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${torito.name}, ${torito.personality.trait.toLowerCase()}`}
            className="absolute inset-0 size-full"
          />
          <canvas
            ref={particlesRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full"
          />
        </>
      )}
      <div
        aria-live="polite"
        className={`pointer-events-none absolute bottom-[96%] z-10 w-max max-w-[min(58vw,240px)] rounded-md bg-surface px-3 py-2 text-[13px] leading-snug font-medium text-text shadow-lg transition-opacity duration-300 lg:text-[14px] ${
          BUBBLE_POSITION[bubbleAlign]
        } ${isBubbleOpen ? 'opacity-100' : 'opacity-0'}`}
      >
        {isBubbleOpen && torito.personality.hello(torito.name)}
      </div>
    </div>
  );
}
