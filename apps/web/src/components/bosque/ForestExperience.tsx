import { Button } from '@heroui/react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type DoorState, ForestDoor } from './ForestDoor';
import './forest.css';
import {
  cameraFor,
  computeLayout,
  DECORATION_SIZES,
  decorationsFor,
  doorBox,
  ForestCamera,
  type ForestLayout,
  START_INDEX,
  WORLDS,
} from './forest-world';
import { ForestParticles, paintStars } from './forest-particles';

const TORITO_WORLD = 'torito';

const DRAG_THRESHOLD = 7;
/** Cuánto cuenta la velocidad del dedo al elegir en qué puerta se detiene. */
const FLICK_SECONDS = 0.16;
const MAX_FRAME_SECONDS = 0.05;
const PAN_DELAY_MS = 700;
const UNLOCK_DELAY_MS = 1300;
const LEAVES_MS = 1050;
const ENTER_MS = 1750;
const BURST_SPARKS = 90;

/** Cuánto se mueve cada capa respecto a las puertas: lo lejano casi no se mueve. */
const DEPTH_MOON = 0.03;
const DEPTH_FAR = 0.1;
const DEPTH_FOREST = 0.28;
const DEPTH_BUSHES = 0.72;
const DEPTH_NEAR = 1.32;
const DEPTH_CANOPY = 1.18;
const BREATH_PIXELS = 3;

interface Props {
  /** Si la puerta del torito es suya; `null` mientras se averigua. */
  isOwner: boolean | null;
  /** Acaba de ganar la puerta: la cámara va hasta ella y se rompe el candado. */
  celebrates: boolean;
  hasPending: boolean;
  startDoorId: string | null;
  notice: string | null;
  onCelebrated: () => void;
  onEnterWorld: (id: string) => void;
  onScan: () => void;
  onProfile: () => void;
  onShop: (categoryPrefix: string) => void;
}

const prefersStillness = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ForestExperience({
  isOwner,
  celebrates,
  hasPending,
  startDoorId,
  notice,
  onCelebrated,
  onEnterWorld,
  onScan,
  onProfile,
  onShop,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLImageElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const forestRef = useRef<HTMLDivElement>(null);
  const bushesRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const canopyRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new ForestCamera(0, 0));
  const particlesRef = useRef<ForestParticles | null>(null);
  const pointerRef = useRef<{ id: number; x: number; lastX: number; lastTime: number } | null>(
    null,
  );
  const movedRef = useRef(false);
  const startIndex = Math.max(
    0,
    WORLDS.findIndex((item) => item.id === startDoorId),
  );
  const firstIndex = startDoorId ? startIndex : START_INDEX;
  const selectedRef = useRef(firstIndex);
  const timersRef = useRef<number[]>([]);

  const [layout, setLayout] = useState<ForestLayout | null>(null);
  const [selected, setSelected] = useState(firstIndex);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const decorations = useMemo(() => decorationsFor(WORLDS.length), []);
  const world = WORLDS[selected]!;

  const later = useCallback((action: () => void, delay: number) => {
    timersRef.current.push(window.setTimeout(action, delay));
  }, []);

  const select = useCallback((index: number, current: ForestLayout) => {
    const next = Math.max(0, Math.min(WORLDS.length - 1, index));
    selectedRef.current = next;
    cameraRef.current.target = cameraFor(next, current);
    setSelected(next);
  }, []);

  // Medidas: todo el mundo se calcula desde el tamaño real de la pantalla.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const next = computeLayout(stage.clientWidth, stage.clientHeight);
      const camera = cameraRef.current;
      camera.setBounds(cameraFor(0, next), cameraFor(WORLDS.length - 1, next));
      camera.jumpTo(cameraFor(selectedRef.current, next));
      if (starsRef.current) paintStars(starsRef.current, next.width, next.height);
      particlesRef.current?.resize(next.width, next.height);
      setLayout(next);
    };
    if (sparksRef.current) particlesRef.current = new ForestParticles(sparksRef.current);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Un solo bucle mueve todas las capas: nada de esto pasa por React.
  useEffect(() => {
    const still = prefersStillness();
    let frame = 0;
    let last = performance.now();
    const paint = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;
      const seconds = now / 1000;
      const camera = cameraRef.current;
      if (still) camera.jumpTo(camera.isDragging ? camera.x : camera.target);
      else camera.step(delta);
      const x = camera.x;
      const breath = still ? 0 : Math.sin(seconds * 0.4) * BREATH_PIXELS;
      const move = (element: HTMLElement | null, depth: number, y = 0) => {
        if (element) element.style.transform = `translate3d(${-x * depth}px, ${y}px, 0)`;
      };
      move(moonRef.current, DEPTH_MOON);
      move(farRef.current, DEPTH_FAR, breath * 0.4);
      move(forestRef.current, DEPTH_FOREST, breath * 0.6);
      move(bushesRef.current, DEPTH_BUSHES);
      move(worldRef.current, 1);
      move(nearRef.current, DEPTH_NEAR, breath * -1);
      move(canopyRef.current, DEPTH_CANOPY, breath);
      particlesRef.current?.draw(seconds, still ? 0 : delta, x);
      if (!still) frame = requestAnimationFrame(paint);
    };
    if (still) {
      const stop = window.setInterval(() => paint(performance.now()), 100);
      return () => window.clearInterval(stop);
    }
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Al volver atrás desde un mundo, el navegador restaura la página tal como se fue.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setOpeningId(null);
    };
    window.addEventListener('pageshow', reset);
    const timers = timersRef.current;
    return () => {
      window.removeEventListener('pageshow', reset);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  // La escena de la puerta que se abre: la cámara viaja hasta ella y se rompe el candado.
  const hasCelebrated = useRef(false);
  const torchIndex = WORLDS.findIndex((item) => item.id === TORITO_WORLD);
  useEffect(() => {
    if (!layout || hasCelebrated.current || !celebrates || !isOwner) return;
    hasCelebrated.current = true;
    setIsUnlocking(true);
    later(() => select(torchIndex, layout), PAN_DELAY_MS);
    later(() => {
      setIsUnlocking(false);
      setJustUnlocked(true);
      onCelebrated();
      if (!prefersStillness()) {
        particlesRef.current?.burst(
          layout.width / 2,
          layout.groundY - layout.doorHeight * 0.45,
          BURST_SPARKS,
        );
      }
    }, PAN_DELAY_MS + UNLOCK_DELAY_MS);
  }, [celebrates, isOwner, later, layout, onCelebrated, select, torchIndex]);

  // Si no se pudo abrir, al menos queda delante de la puerta que venía a buscar.
  useEffect(() => {
    if (!layout || !celebrates || isOwner !== false) return;
    select(torchIndex, layout);
  }, [celebrates, isOwner, layout, select, torchIndex]);

  const stateOf = (id: string, status: string): DoorState => {
    if (status === 'soon') return 'soon';
    if (id !== TORITO_WORLD) return 'locked';
    if (isUnlocking) return 'locked';
    if (isOwner === null) return 'waiting';
    if (!isOwner) return 'locked';
    return justUnlocked ? 'unlocking' : 'open';
  };

  const enter = (index: number) => {
    const door = WORLDS[index]!;
    if (!door.target || openingId) return;
    if (prefersStillness()) {
      onEnterWorld(door.id);
      return;
    }
    setOpeningId(door.id);
    later(() => stageRef.current?.classList.add('is-entering'), LEAVES_MS * 0.42);
    later(() => onEnterWorld(door.id), ENTER_MS);
  };

  const pressDoor = (index: number) => {
    if (movedRef.current || !layout || openingId) return;
    if (index !== selected) {
      select(index, layout);
      return;
    }
    const door = WORLDS[index]!;
    if (stateOf(door.id, door.status) === 'open' || stateOf(door.id, door.status) === 'unlocking') {
      enter(index);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (openingId || (event.pointerType === 'mouse' && event.button !== 0)) return;
    movedRef.current = false;
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const camera = cameraRef.current;
    if (!movedRef.current) {
      if (Math.abs(event.clientX - pointer.x) < DRAG_THRESHOLD) return;
      movedRef.current = true;
      camera.isDragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    const delta = event.clientX - pointer.lastX;
    const elapsed = Math.max((now - pointer.lastTime) / 1000, 0.001);
    camera.dragBy(-delta);
    camera.velocity = camera.velocity * 0.6 + (-delta / elapsed) * 0.4;
    pointer.lastX = event.clientX;
    pointer.lastTime = now;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointerRef.current = null;
    const camera = cameraRef.current;
    if (!movedRef.current || !layout) return;
    camera.isDragging = false;
    // Un dedo quieto antes de soltar no es un gesto rápido.
    if (performance.now() - pointer.lastTime > 90) camera.velocity = 0;
    // Por rápido que sea el gesto, solo avanza una puerta más allá de donde quedó el dedo.
    const center = camera.x + layout.width / 2;
    const nearest = Math.round(center / layout.spacing);
    const landing = Math.round((center + camera.velocity * FLICK_SECONDS) / layout.spacing);
    select(Math.max(nearest - 1, Math.min(nearest + 1, landing)), layout);
    // El `click` llega después: lo que fue arrastre no debe abrir la puerta.
    window.setTimeout(() => {
      movedRef.current = false;
    }, 0);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!layout || openingId) return;
    if (event.key === 'ArrowLeft') select(selected - 1, layout);
    if (event.key === 'ArrowRight') select(selected + 1, layout);
  };

  const state = stateOf(world.id, world.status);
  const isOpen = state === 'open' || state === 'unlocking';
  const worldWidth = layout ? layout.spacing * (WORLDS.length + 1) + layout.width * 2 : 0;

  return (
    <div className="surface-dark bosque">
      <div
        ref={stageRef}
        className={`bosque-stage ${layout ? 'is-ready' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="bosque-zoom">
          <canvas ref={starsRef} className="bosque-fill" aria-hidden="true" />
          {layout && (
            <>
              <img
                ref={moonRef}
                className="bosque-moon"
                src="/bosque/luna.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                  left:
                    layout.width * (layout.isPortrait ? 0.68 : 0.27) +
                    cameraFor(START_INDEX, layout) * DEPTH_MOON,
                  top: layout.height * (layout.isPortrait ? 0.1 : 0.07),
                  width: Math.min(layout.height * 0.14, 128),
                }}
              />
              <div
                ref={farRef}
                className="bosque-layer bosque-far"
                aria-hidden="true"
                style={{ top: layout.groundY - layout.height * 0.5, height: layout.height * 0.36 }}
              />
              <div className="bosque-fog bosque-fog-back" aria-hidden="true" />
              <div
                ref={forestRef}
                className="bosque-layer bosque-trees"
                aria-hidden="true"
                style={{
                  top: layout.groundY - layout.height * 0.2,
                  height: layout.height * 0.22,
                }}
              />
              <div className="bosque-fog bosque-fog-front" aria-hidden="true" />
              <div
                ref={bushesRef}
                className="bosque-layer bosque-bushes"
                aria-hidden="true"
                style={{
                  top: layout.groundY - layout.doorHeight * 0.17,
                  height: layout.doorHeight * 0.2,
                }}
              />
              <div
                className="bosque-water"
                style={{ top: layout.groundY + layout.doorHeight * 0.05 }}
              />

              <div ref={worldRef} className="bosque-world" style={{ width: worldWidth }}>
                <div
                  className="bosque-path"
                  aria-hidden="true"
                  style={{
                    top: layout.groundY - layout.doorHeight * 0.035,
                    height: layout.doorHeight * 0.1,
                    left: -layout.width,
                  }}
                />
                {WORLDS.map((item, index) => {
                  const box = doorBox(item, index, layout);
                  return (
                    <img
                      key={item.id}
                      className="bosque-reflection"
                      src={item.sprite}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{
                        left: box.left,
                        top: layout.groundY + layout.doorHeight * 0.05,
                        width: box.width,
                        height: box.height,
                      }}
                    />
                  );
                })}
                {decorations
                  .filter((item) => !item.front)
                  .map((item, index) => (
                    <Decoration key={index} item={item} layout={layout} />
                  ))}
                {WORLDS.map((item, index) => (
                  <ForestDoor
                    key={item.id}
                    world={item}
                    box={doorBox(item, index, layout)}
                    state={stateOf(item.id, item.status)}
                    isSelected={index === selected}
                    isOpening={openingId === item.id}
                    onPress={() => pressDoor(index)}
                  />
                ))}
                {decorations
                  .filter((item) => item.front)
                  .map((item, index) => (
                    <Decoration key={index} item={item} layout={layout} />
                  ))}
              </div>

              <div ref={nearRef} className="bosque-layer bosque-near" aria-hidden="true">
                {Array.from({ length: WORLDS.length + 2 }, (_, index) => (
                  <img
                    key={index}
                    src={index % 2 ? '/bosque/flor-1.webp' : '/bosque/roca-musgo-1.webp'}
                    alt=""
                    draggable={false}
                    className={index % 2 ? 'bosque-sways' : undefined}
                    style={{
                      left: layout.spacing * 1.32 * (index - 0.4),
                      width: Math.min(layout.width * 0.34, 280),
                    }}
                  />
                ))}
              </div>
              <div ref={canopyRef} className="bosque-layer bosque-canopy" aria-hidden="true">
                {Array.from({ length: WORLDS.length + 2 }, (_, index) => (
                  <img
                    key={index}
                    src={index % 2 ? '/bosque/rama-derecha.webp' : '/bosque/rama-izquierda.webp'}
                    alt=""
                    draggable={false}
                    style={{
                      left: layout.spacing * 1.18 * index * 1.45 - layout.width * 0.3,
                      width: Math.min(layout.width * 0.52, 400),
                      animationDelay: `${index * -1.7}s`,
                    }}
                  />
                ))}
              </div>
            </>
          )}
          <canvas ref={sparksRef} className="bosque-fill bosque-sparks" aria-hidden="true" />
        </div>
        <div className="bosque-light-veil" aria-hidden="true" />
      </div>

      {layout && (
        <>
          <button
            type="button"
            className="bosque-arrow bosque-arrow-left"
            aria-label="Puerta anterior"
            disabled={selected === 0}
            onClick={() => select(selected - 1, layout)}
          >
            <Chevron points="15 5 8 12 15 19" />
          </button>
          <button
            type="button"
            className="bosque-arrow bosque-arrow-right"
            aria-label="Puerta siguiente"
            disabled={selected === WORLDS.length - 1}
            onClick={() => select(selected + 1, layout)}
          >
            <Chevron points="9 5 16 12 9 19" />
          </button>
        </>
      )}

      <section className="bosque-panel" aria-live="polite">
        <div className="bosque-dots" aria-hidden="true">
          {WORLDS.map((item, index) => (
            <span key={item.id} className={index === selected ? 'is-active' : undefined} />
          ))}
        </div>
        <div className="bosque-card">
          <h2 className="bosque-name font-display">{world.name}</h2>
          <p className="bosque-text">
            {state === 'unlocking'
              ? '¡Tu puerta se abrió! Tócala para entrar.'
              : isOpen
                ? world.openText
                : world.lockedText}
          </p>
          {notice && (
            <p role="alert" className="type-meta rounded-sm bg-surface px-4 py-3 text-text">
              {notice}
            </p>
          )}
          <div className="bosque-actions">
            {isOpen && (
              <Button
                className="h-12 bg-on-dark px-8 text-[15px] font-medium text-text"
                isDisabled={Boolean(openingId)}
                onPress={() => enter(selected)}
              >
                Entrar
              </Button>
            )}
            {state === 'locked' && world.target && (
              <Button
                className="h-12 bg-on-dark px-7 text-[15px] font-medium text-text"
                onPress={hasPending ? onProfile : onScan}
              >
                {hasPending ? 'Guardar mi torito' : 'Escanear mi QR'}
              </Button>
            )}
            {!isOpen && world.shop && (
              <button
                type="button"
                className="bosque-link"
                onClick={() => world.shop && onShop(world.shop.categoryPrefix)}
              >
                {world.shop.label}
              </button>
            )}
            {state === 'locked' && world.target && (
              <button type="button" className="bosque-link" onClick={() => onEnterWorld(world.id)}>
                Mirar adentro
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Chevron({ points }: { points: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points={points} />
    </svg>
  );
}

function Decoration({
  item,
  layout,
}: {
  item: ReturnType<typeof decorationsFor>[number];
  layout: ForestLayout;
}) {
  const [width, height] = DECORATION_SIZES[item.name];
  const shown = layout.doorHeight * item.size;
  return (
    <img
      src={`/bosque/${item.name}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={width}
      height={height}
      className={`bosque-decoration bosque-d-${item.name} ${item.sways ? 'bosque-sways' : ''}`}
      style={{
        left: layout.spacing * item.at - shown / 2,
        top: layout.groundY - item.lift * layout.doorHeight - (shown * height) / width,
        width: shown,
        height: 'auto',
        animationDelay: `${item.at * -1.9}s`,
      }}
    />
  );
}
