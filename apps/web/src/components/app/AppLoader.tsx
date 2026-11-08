import { Logo } from '@antrina/ui';
import { useEffect, useRef, useState } from 'react';
import { GENERAL_TIPS, WORLDS, type World, worldById } from '../bosque/forest-world';

const TIP_MS = 3200;
/** Sin una espera mínima, la pantalla de carga parpadearía con las imágenes ya en caché. */
const MIN_FIRST_MS = 1500;
const MIN_NEXT_MS = 650;
const BAR_EASE = 0.09;
const MAX_LOAD_MS = 12000;

const SCENERY = [
  'lejos',
  'bosque',
  'matorral',
  'sendero',
  'luna',
  'rama-izquierda',
  'rama-derecha',
  'flor-1',
  'flor-2',
  'hierba',
  'cristales',
  'roca',
  'roca-musgo-1',
  'roca-musgo-2',
  'loto',
  'cascada',
  'reflejo',
].map((name) => `/bosque/${name}.webp`);

export const FOREST_ASSETS = [...WORLDS.map((world) => world.sprite), ...SCENERY];

/** Lo que ya se cargó en esta visita no vuelve a mostrar la pantalla de carga. */
const loadedKeys = new Set<string>();

function loadImage(source: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      void image
        .decode()
        .catch(() => undefined)
        .then(resolve);
    };
    // Una imagen que falla no debe dejar a nadie esperando para siempre.
    image.onerror = () => resolve();
    image.src = source;
  });
}

/** Carga de verdad los recursos y cuenta cuántos van: la barra nunca finge. */
export function useAssetGate(key: string, assets: readonly string[]) {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loadedKeys.has(key) || assets.length === 0) {
      setProgress(1);
      setIsReady(true);
      return;
    }
    let isActive = true;
    let done = 0;
    setIsReady(false);
    setProgress(0);
    const started = performance.now();
    const minimum = loadedKeys.size === 0 ? MIN_FIRST_MS : MIN_NEXT_MS;
    const finish = () => {
      if (!isActive) return;
      loadedKeys.add(key);
      setProgress(1);
      const rest = Math.max(0, minimum - (performance.now() - started));
      window.setTimeout(() => isActive && setIsReady(true), rest);
    };
    const giveUp = window.setTimeout(finish, MAX_LOAD_MS);
    void Promise.all(
      assets.map((source) =>
        loadImage(source).then(() => {
          done += 1;
          if (isActive) setProgress(done / assets.length);
        }),
      ),
    ).then(() => {
      window.clearTimeout(giveUp);
      finish();
    });
    return () => {
      isActive = false;
      window.clearTimeout(giveUp);
    };
  }, [assets, key]);

  return { progress, isReady };
}

/** Pantalla de carga: el arte del mundo al que entras, un consejo y el progreso real. */
export function AppLoader({
  world,
  progress,
  isLeaving,
}: {
  world: World | null;
  progress: number;
  isLeaving: boolean;
}) {
  const barRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);
  const targetRef = useRef(progress);
  targetRef.current = progress;

  const tips = world ? world.tips : GENERAL_TIPS;
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (tips.length < 2) return;
    const timer = window.setInterval(
      () => setTipIndex((index) => (index + 1) % tips.length),
      TIP_MS,
    );
    return () => window.clearInterval(timer);
  }, [tips.length]);

  // La barra avanza suave aunque las imágenes lleguen a saltos.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      shownRef.current += (targetRef.current - shownRef.current) * BAR_EASE;
      const shown = targetRef.current === 1 && shownRef.current > 0.995 ? 1 : shownRef.current;
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`;
      if (labelRef.current) labelRef.current.textContent = `${Math.round(shown * 100)} %`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const center = world ?? worldById('bonsai') ?? WORLDS[0]!;
  const left = worldById('zodiacal');
  const right = worldById('torito');

  return (
    <div
      className={`app-loader ${isLeaving ? 'is-leaving' : ''}`}
      role="status"
      aria-label={world ? `Entrando a ${world.name}` : 'Abriendo el bosque'}
      style={world ? { background: world.theme.bg } : undefined}
    >
      <div className="app-loader-logo">
        <Logo href="/" label="Antrina" tone="dark" />
      </div>
      <div className="app-loader-moon" aria-hidden="true" />
      <div className="app-loader-art" aria-hidden="true">
        {!world && left && right && (
          <>
            <img className="is-side is-left" src={left.sprite} alt="" />
            <img className="is-side is-right" src={right.sprite} alt="" />
          </>
        )}
        <img className="is-main" src={center.sprite} alt="" />
      </div>
      <div className="app-loader-bottom">
        <p className="app-loader-title font-display">
          {world ? world.name : 'El bosque de las puertas'}
        </p>
        <p key={tipIndex} className="app-loader-tip">
          {tips[tipIndex % tips.length]}
        </p>
        <div className="app-loader-bar">
          <span ref={barRef} className="app-loader-fill" />
          <span ref={labelRef} className="app-loader-percent">
            0 %
          </span>
        </div>
      </div>
    </div>
  );
}
