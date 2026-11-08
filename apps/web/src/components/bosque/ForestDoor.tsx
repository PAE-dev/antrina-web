import { type CSSProperties } from 'react';
import { type DoorBox, type World } from './forest-world';

/** `waiting`: aún no se sabe si es suya; así no parpadea el candado de quien ya la tiene. */
export type DoorState = 'waiting' | 'soon' | 'locked' | 'unlocking' | 'open';

function Padlock() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="bosque-padlock-icon"
    >
      <path className="bosque-padlock-shackle" d="M15 22v-7a9 9 0 0 1 18 0v7" />
      <rect x="10" y="22" width="28" height="20" rx="3" />
      <path d="M24 30v5" />
      <circle cx="24" cy="29" r="1.5" />
    </svg>
  );
}

const STATE_LABELS: Record<DoorState, string> = {
  waiting: '',
  soon: 'todavía no disponible',
  locked: 'cerrada',
  unlocking: 'abierta',
  open: 'abierta',
};

/**
 * Una puerta: su sprite y, encima del hueco, dos hojas recortadas del mismo sprite que giran de
 * verdad al abrirse y dejan ver lo que hay detrás.
 */
export function ForestDoor({
  world,
  box,
  state,
  isSelected,
  isOpening,
  onPress,
}: {
  world: World;
  box: DoorBox;
  state: DoorState;
  isSelected: boolean;
  isOpening: boolean;
  onPress: () => void;
}) {
  const { arch } = world;
  const portal = {
    left: arch.x * box.width,
    top: arch.y * box.height,
    width: arch.w * box.width,
    height: arch.h * box.height,
  };
  const radiusX = portal.width / 2;
  const radiusY = radiusX * arch.round;
  const leaf: CSSProperties = {
    backgroundImage: `url(${world.sprite})`,
    backgroundSize: `${box.width}px ${box.height}px`,
  };
  const classes = [
    'bosque-door',
    `is-${state}`,
    isSelected && 'is-selected',
    isOpening && 'is-opening',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      aria-label={`${world.name}${STATE_LABELS[state] ? `, ${STATE_LABELS[state]}` : ''}`}
      aria-current={isSelected ? 'true' : undefined}
      onClick={onPress}
    >
      <span className="bosque-door-aura" aria-hidden="true" />
      <span className="bosque-door-art" aria-hidden="true">
        <img
          src={world.sprite}
          alt=""
          width={world.width}
          height={world.height}
          draggable={false}
        />
        {world.lights.map(([x = 0, y = 0], index) => (
          <span
            key={index}
            className="bosque-door-light"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              animationDelay: `${index * -1.3}s`,
            }}
          />
        ))}
      </span>
      <span
        className="bosque-portal"
        aria-hidden="true"
        style={{
          ...portal,
          borderRadius: `${radiusX}px ${radiusX}px 2px 2px / ${radiusY}px ${radiusY}px 2px 2px`,
        }}
      >
        {isOpening && (
          <>
            {world.inside && <img className="bosque-portal-inside" src={world.inside} alt="" />}
            <span className="bosque-portal-light" />
            <span
              className="bosque-leaf bosque-leaf-left"
              style={{ ...leaf, backgroundPosition: `${-portal.left}px ${-portal.top}px` }}
            />
            <span
              className="bosque-leaf bosque-leaf-right"
              style={{
                ...leaf,
                backgroundPosition: `${-portal.left - portal.width / 2}px ${-portal.top}px`,
              }}
            />
          </>
        )}
      </span>
      {(state === 'locked' || state === 'unlocking') && (
        <span
          className="bosque-padlock"
          aria-hidden="true"
          style={{
            left: portal.left + portal.width / 2,
            top: portal.top + portal.height * 0.55,
          }}
        >
          <Padlock />
        </span>
      )}
    </button>
  );
}
