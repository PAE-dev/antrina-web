import { type LocaleCode } from '@antrina/contracts';
import { ArrowRightIcon, ButtonLink } from '@antrina/ui';
import { Button } from '@heroui/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { AmbientAudio } from '../../world/audio';
import { AccountChip } from '../account/AccountChip';
import type { NearTarget, WorldEngine } from '../../world/engine';
import { HUB_ID, themeFor } from '../../world/worlds';

export interface WorldDoor {
  /** Categoría de la intención (id del mundo). */
  id: string;
  label: string;
  stones: string;
  text: string;
  href: string;
  /** Lleva a otra página en vez de a un mundo 3D. */
  portal?: boolean;
}

export interface WorldLabels {
  eyebrow: string;
  title: string;
  text: string;
  enter: string;
  skip: string;
  loading: string;
  hub: string;
  controlsDesktop: string;
  controlsTouch: string;
  enterDoor: string;
  doorPrefix: string;
  walkIn: string;
  backToForest: string;
  backHint: string;
  viewTrees: string;
  resume: string;
  paused: string;
  exit: string;
  reopen: string;
  soundOn: string;
  soundOff: string;
  fullscreen: string;
  touch: TouchLabels;
  toritosSign: { title: string; body: string };
}

interface Props {
  doors: WorldDoor[];
  labels: WorldLabels;
  locale: LocaleCode;
  /** Página "Mi cuenta": la sesión es la misma en el bosque y en cada mundo. */
  accountHref: string;
}

type Phase = 'loading' | 'intro' | 'playing' | 'closed';

const SEEN_KEY = 'antrina-world-exited';

function readExited(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Mundo 3D de la portada: el Bosque de las Intenciones, con una puerta por intención. */
export function WorldExperience({ doors, labels, locale, accountHref }: Props) {
  const [supported] = useState(() => hasWebGL());
  const [phase, setPhase] = useState<Phase>(() => (readExited() ? 'closed' : 'loading'));
  const [progress, setProgress] = useState(0);
  const [near, setNear] = useState<NearTarget | null>(null);
  const [worldId, setWorldId] = useState(HUB_ID);
  const [veil, setVeil] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [hadLock, setHadLock] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // Pantalla táctil: botones en pantalla y calidad ajustada.
  const [touch] = useState(
    () =>
      window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0 ||
      (navigator.hardwareConcurrency ?? 8) <= 4,
  );
  const [lowQuality] = useState(
    () =>
      window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4,
  );
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const audioRef = useRef<AmbientAudio | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const open = phase !== 'closed';

  // Monta el motor cuando la experiencia está abierta.
  useEffect(() => {
    if (!open || !supported || !mountRef.current) return;
    let cancelled = false;
    const mount = mountRef.current;
    void import('../../world/engine').then(async ({ WorldEngine }) => {
      if (cancelled) return;
      const engine = new WorldEngine(
        mount,
        {
          doors: doors.map(({ id, label, stones, portal }) => ({ id, label, stones, portal })),
          returnLabel: labels.backToForest,
          returnHint: labels.backHint,
          toritosSign: labels.toritosSign,
          low: lowQuality,
        },
        {
          onProgress: (value) => setProgress(value),
          onNear: (target) => setNear(target),
          onWorld: (id) => {
            setWorldId(id);
            audioRef.current?.setChord(themeFor(id).chord);
          },
          onTransition: (color) => {
            setVeil(color);
            if (color) audioRef.current?.whoosh();
          },
          onPortal: (id) => {
            const target = doors.find((item) => item.id === id);
            if (target) window.location.assign(target.href);
          },
          onLockChange: (value) => {
            setLocked(value);
            if (value) setHadLock(true);
          },
        },
      );
      engineRef.current = engine;
      if (import.meta.env.DEV)
        (window as unknown as { __antrinaWorld?: unknown }).__antrinaWorld = engine;
      await engine.init();
      if (!cancelled) setPhase((current) => (current === 'loading' ? 'intro' : current));
    });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
      audioRef.current?.dispose();
      audioRef.current = null;
    };
    // El motor se crea una vez por apertura; textos y puertas no cambian en la página.
  }, [open, supported]);

  // Bloquea el scroll de la tienda mientras el mundo está abierto.
  useEffect(() => {
    if (!open || !supported) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open, supported]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setTimeout(() => setShowControls(false), 7000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const start = useCallback(() => {
    setPhase('playing');
    setShowControls(true);
    if (!audioRef.current) {
      audioRef.current = new AmbientAudio();
      audioRef.current.setMuted(muted);
      audioRef.current.start(themeFor(worldId).chord);
    }
    engineRef.current?.requestLock();
  }, [muted, worldId]);

  const close = useCallback(() => {
    engineRef.current?.releaseLock();
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sin almacenamiento: solo se cierra */
    }
    setPhase('closed');
    setNear(null);
    setWorldId(HUB_ID);
    setVeil(null);
  }, []);

  const reopen = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SEEN_KEY);
    } catch {
      /* nada */
    }
    setProgress(0);
    setPhase('loading');
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      audioRef.current?.setMuted(!value);
      return !value;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  if (!supported) return null;

  if (!open) {
    return (
      <Button
        onPress={reopen}
        className="fixed bottom-5 left-5 z-40 h-11 bg-brand px-5 text-[15px] text-on-dark"
      >
        <span className="rombo" aria-hidden="true" />
        {labels.reopen}
      </Button>
    );
  }

  const door = near?.kind === 'door' ? doors.find((item) => item.id === near.id) : undefined;
  const currentDoor = doors.find((item) => item.id === worldId);
  const paused = phase === 'playing' && !touch && hadLock && !locked && !veil;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] touch-none overscroll-none bg-brand text-on-dark select-none"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title.replaceAll('*', '')}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Velo de transición entre mundos. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ backgroundColor: veil ?? 'transparent', opacity: veil ? 1 : 0 }}
      />

      {/* Barra superior */}
      {phase === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
          <div className="pointer-events-auto flex items-center gap-4">
            <img
              src="/brand/antrina-logo-negativo.svg"
              alt="Antrina"
              className="h-9 w-auto md:h-10"
            />
            <span className="type-label hidden !text-on-dark sm:inline">
              {currentDoor ? currentDoor.label : labels.hub}
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-1">
            <AccountChip locale={locale} accountHref={accountHref} className="mr-2" />
            <IconButton label={muted ? labels.soundOn : labels.soundOff} onPress={toggleMute}>
              {muted ? <SoundOffIcon /> : <SoundOnIcon />}
            </IconButton>
            <IconButton label={labels.fullscreen} onPress={toggleFullscreen}>
              <ExpandIcon />
            </IconButton>
            <IconButton label={labels.exit} onPress={close}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      )}

      {/* Mira central (rombo de marca) */}
      {phase === 'playing' && locked && (
        <span
          aria-hidden="true"
          className="rombo pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80"
        />
      )}

      {/* Indicaciones de controles */}
      {phase === 'playing' && showControls && !near && (
        <p
          className={`type-meta pointer-events-none absolute inset-x-0 px-6 text-center !text-on-dark ${
            touch ? (currentDoor ? 'top-[132px]' : 'top-[76px]') : 'bottom-10'
          }`}
        >
          {touch ? labels.controlsTouch : labels.controlsDesktop}
        </p>
      )}

      {/* Cerca de una puerta del bosque */}
      {phase === 'playing' && door && (
        <Prompt top={touch}>
          <span className="type-label !text-mist">{labels.doorPrefix}</span>
          <span className="type-h3 font-display">{door.label}</span>
          <span className="type-meta !text-on-dark-muted">{door.stones}</span>
          {touch ? (
            <Button
              onPress={() => engineRef.current?.enterNear()}
              className="mt-2 h-11 bg-on-dark px-6 text-[15px] text-text"
            >
              {labels.enterDoor}
            </Button>
          ) : (
            <span className="type-meta mt-1 !text-on-dark">{labels.walkIn}</span>
          )}
        </Prompt>
      )}

      {/* Cerca de la puerta de regreso */}
      {phase === 'playing' && near?.kind === 'return' && (
        <Prompt top={touch}>
          <span className="type-h3 font-display">{labels.backToForest}</span>
          {touch ? (
            <Button
              onPress={() => engineRef.current?.enterNear()}
              className="mt-2 h-11 bg-on-dark px-6 text-[15px] text-text"
            >
              {labels.enterDoor}
            </Button>
          ) : (
            <span className="type-meta mt-1 !text-on-dark">{labels.walkIn}</span>
          )}
        </Prompt>
      )}

      {/* Junto al árbol de cristal de un mundo: invitación a la colección */}
      {phase === 'playing' && near?.kind === 'tree' && currentDoor && (
        <Prompt wide top={touch}>
          <span className="type-label !text-mist">{currentDoor.stones}</span>
          <span className="type-h3 font-display">{currentDoor.label}</span>
          <span className="type-meta max-w-sm !text-on-dark">{currentDoor.text}</span>
          <ButtonLink
            href={currentDoor.href}
            variant="inverse"
            withArrow
            className="pointer-events-auto mt-3"
          >
            {labels.viewTrees}
          </ButtonLink>
        </Prompt>
      )}

      {/* Accesos fijos dentro de un mundo */}
      {phase === 'playing' && currentDoor && near?.kind !== 'tree' && (
        <div
          className={`absolute right-4 flex flex-col items-end gap-2 md:right-6 ${
            touch ? 'top-[68px]' : 'bottom-4 md:bottom-6'
          }`}
        >
          <a
            href={currentDoor.href}
            className="inline-flex items-center gap-2 text-[15px] font-medium text-on-dark underline decoration-on-dark/40 underline-offset-[6px]"
          >
            {labels.viewTrees}
            <ArrowRightIcon />
          </a>
          <button
            type="button"
            onClick={() => engineRef.current?.goHome()}
            className="type-meta !text-on-dark-muted underline underline-offset-4"
          >
            {labels.backToForest}
          </button>
        </div>
      )}

      {/* Botones táctiles */}
      {phase === 'playing' && touch && !veil && (
        <TouchControls
          labels={labels.touch}
          onMove={(x, y) => engineRef.current?.setStick(x, y)}
          onTurn={(value) => engineRef.current?.setTurn(value)}
        />
      )}

      {/* Pantalla de entrada */}
      {(phase === 'loading' || phase === 'intro') && (
        <div className="absolute inset-0 flex touch-pan-y flex-col justify-end overflow-y-auto bg-brand/45 p-6 pb-10 md:p-14">
          <AccountChip
            locale={locale}
            accountHref={accountHref}
            className="absolute top-5 right-5 md:top-8 md:right-8"
          />
          <div className="max-w-xl">
            <img
              src="/brand/antrina-logo-negativo.svg"
              alt="Antrina"
              className="mb-6 h-11 w-auto md:mb-10 md:h-12"
            />
            <p className="type-label mb-4 flex items-center gap-3 !text-mist">
              <span className="rombo" aria-hidden="true" />
              {labels.eyebrow}
            </p>
            <h2 className="type-display font-display text-on-dark">
              <Emphasized text={labels.title} />
            </h2>
            <p className="type-body mt-5 max-w-md !text-on-dark">{labels.text}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {phase === 'loading' ? (
                <div className="flex w-64 flex-col gap-2" role="status" aria-live="polite">
                  <span className="type-label !text-on-dark">
                    {labels.loading} {Math.round(progress * 100)}%
                  </span>
                  <span className="block h-px w-full bg-border-dark">
                    <span
                      className="block h-px bg-clay transition-[width] duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </span>
                </div>
              ) : (
                <Button
                  onPress={start}
                  size="lg"
                  className="h-12 bg-on-dark px-7 text-[15px] text-text"
                >
                  {labels.enter}
                  <ArrowRightIcon />
                </Button>
              )}
              <button
                type="button"
                onClick={close}
                className="text-[15px] font-medium text-on-dark underline decoration-on-dark/40 underline-offset-[6px]"
              >
                {labels.skip}
              </button>
            </div>
            <p className="type-meta mt-8 !text-on-dark-muted">
              {touch ? labels.controlsTouch : labels.controlsDesktop}
            </p>
          </div>
        </div>
      )}

      {/* Pausa (escritorio, al soltar el puntero) */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand/50 p-6">
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="type-label !text-mist">{labels.paused}</p>
            <Button
              onPress={start}
              size="lg"
              className="h-12 bg-on-dark px-7 text-[15px] text-text"
            >
              {labels.resume}
            </Button>
            <button
              type="button"
              onClick={close}
              className="text-[15px] font-medium text-on-dark underline decoration-on-dark/40 underline-offset-[6px]"
            >
              {labels.exit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ piezas */

function Prompt({
  children,
  wide = false,
  top = false,
}: {
  children: ReactNode;
  wide?: boolean;
  top?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 ${
        top ? 'top-[72px]' : 'bottom-12'
      }`}
    >
      <div
        className={`pointer-events-auto flex flex-col items-center gap-1 rounded-md border border-border-dark bg-brand/70 px-6 py-4 text-center backdrop-blur-sm ${wide ? 'max-w-md' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function Emphasized({ text }: { text: string }) {
  const parts = text.split('*');
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <em key={index} className="not-italic !text-clay">
            {part}
          </em>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      isIconOnly
      variant="ghost"
      aria-label={label}
      onPress={onPress}
      className="text-on-dark hover:bg-on-dark/10"
    >
      {children}
    </Button>
  );
}

type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTION_VECTOR: Record<Direction, [number, number]> = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

/**
 * Controles táctiles: cruceta de flechas para caminar (izquierda) y dos botones para girar
 * (derecha). Se pueden pulsar a la vez con dos dedos; también se mira arrastrando en la pantalla.
 */
function TouchControls({
  labels,
  onMove,
  onTurn,
}: {
  labels: TouchLabels;
  onMove: (x: number, y: number) => void;
  onTurn: (value: number) => void;
}) {
  const [pressed, setPressed] = useState<Set<Direction>>(new Set());
  const [turning, setTurning] = useState(0);

  const press = (direction: Direction, down: boolean) => {
    setPressed((current) => {
      const next = new Set(current);
      if (down) next.add(direction);
      else next.delete(direction);
      let x = 0;
      let y = 0;
      for (const d of next) {
        x += DIRECTION_VECTOR[d][0];
        y += DIRECTION_VECTOR[d][1];
      }
      // 0.85: paso de caminata (a partir de ~0.92 el motor corre).
      onMove(x * 0.85, y * 0.85);
      return next;
    });
  };

  const turn = (value: number) => {
    setTurning(value);
    onTurn(value);
  };

  const safeBottom = 'calc(env(safe-area-inset-bottom, 0px) + 18px)';
  return (
    <>
      <div
        className="absolute grid touch-none grid-cols-3 grid-rows-3 gap-1.5 select-none"
        style={{ left: 'calc(env(safe-area-inset-left, 0px) + 16px)', bottom: safeBottom }}
      >
        <PadButton
          label={labels.forward}
          active={pressed.has('up')}
          className="col-start-2 row-start-1"
          onChange={(down) => press('up', down)}
        >
          <ChevronIcon rotate={0} />
        </PadButton>
        <PadButton
          label={labels.left}
          active={pressed.has('left')}
          className="col-start-1 row-start-2"
          onChange={(down) => press('left', down)}
        >
          <ChevronIcon rotate={-90} />
        </PadButton>
        <PadButton
          label={labels.right}
          active={pressed.has('right')}
          className="col-start-3 row-start-2"
          onChange={(down) => press('right', down)}
        >
          <ChevronIcon rotate={90} />
        </PadButton>
        <PadButton
          label={labels.back}
          active={pressed.has('down')}
          className="col-start-2 row-start-3"
          onChange={(down) => press('down', down)}
        >
          <ChevronIcon rotate={180} />
        </PadButton>
      </div>
      <div
        className="absolute flex touch-none gap-2 select-none"
        style={{ right: 'calc(env(safe-area-inset-right, 0px) + 16px)', bottom: safeBottom }}
      >
        <PadButton
          label={labels.turnLeft}
          active={turning < 0}
          onChange={(down) => turn(down ? -1 : 0)}
        >
          <TurnIcon />
        </PadButton>
        <PadButton
          label={labels.turnRight}
          active={turning > 0}
          onChange={(down) => turn(down ? 1 : 0)}
        >
          <TurnIcon flip />
        </PadButton>
      </div>
    </>
  );
}

export interface TouchLabels {
  forward: string;
  back: string;
  left: string;
  right: string;
  turnLeft: string;
  turnRight: string;
}

/** Botón que se mantiene pulsado (mientras el dedo esté encima). */
function PadButton({
  label,
  active,
  className = '',
  onChange,
  children,
}: {
  label: string;
  active: boolean;
  className?: string;
  onChange: (down: boolean) => void;
  children: ReactNode;
}) {
  const pointer = useRef<number | null>(null);
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    onChange(false);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex size-14 items-center justify-center rounded-full border text-on-dark backdrop-blur-sm transition-colors [-webkit-touch-callout:none] ${
        active ? 'border-on-dark/70 bg-on-dark/30' : 'border-on-dark/30 bg-brand/45'
      } ${className}`}
      onPointerDown={(event) => {
        event.preventDefault();
        pointer.current = event.pointerId;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* puntero no capturable: el botón sigue funcionando */
        }
        onChange(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ rotate }: { rotate: number }) {
  return (
    <svg {...iconProps} width={24} height={24} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="m6 14 6-6 6 6" />
    </svg>
  );
}

function TurnIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      {...iconProps}
      width={24}
      height={24}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M5 13a7 7 0 1 0 2.5-5.4" />
      <path d="M5 4v4h4" />
    </svg>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SoundOnIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
