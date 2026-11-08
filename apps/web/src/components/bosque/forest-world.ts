import { WORLDS_CONFIG, type WorldDto, type WorldStatus } from '@antrina/contracts';

export type { WorldStatus };
export type World = WorldDto;

/** El mundo vive en otra página de la tienda, no dentro de la app. */
export const isExternalWorld = (world: World) =>
  world.target !== null && !world.target.startsWith('/mundos');

/** Para agregar un mundo basta con su sprite y una entrada en `WORLDS_CONFIG` (`@antrina/contracts`). */
export const WORLDS = WORLDS_CONFIG.worlds;
export const GENERAL_TIPS = WORLDS_CONFIG.tips;
export const worldById = (id: string) => WORLDS.find((world) => world.id === id);
export const START_INDEX = Math.max(
  0,
  WORLDS.findIndex((world) => world.id === WORLDS_CONFIG.start),
);

export interface ForestLayout {
  width: number;
  height: number;
  isPortrait: boolean;
  /** Línea donde se apoyan las puertas. */
  groundY: number;
  /** Alto de una puerta de escala 1. */
  doorHeight: number;
  /** Distancia entre los centros de dos puertas. */
  spacing: number;
}

/** Sitio para la cabecera de la app. */
const HEADER_ROOM = 104;
/** En vertical, lo que ocupan abajo la tarjeta y el menú: la puerta se lleva todo lo demás. */
const PORTRAIT_BOTTOM_MIN = 186;
const PORTRAIT_BOTTOM_SHARE = 0.25;

export function computeLayout(width: number, height: number): ForestLayout {
  const isPortrait = height > width;
  const groundY = Math.round(
    isPortrait
      ? height - Math.max(PORTRAIT_BOTTOM_MIN, height * PORTRAIT_BOTTOM_SHARE)
      : height * 0.68,
  );
  const widest = Math.max(...WORLDS.map((world) => (world.width / world.height) * world.scale));
  const doorHeight = Math.round(
    Math.min(
      groundY - HEADER_ROOM,
      height * (isPortrait ? 0.56 : 0.5),
      (width * (isPortrait ? 0.86 : 0.5)) / widest,
    ),
  );
  const spacing = Math.round(isPortrait ? width * 0.88 : Math.max(doorHeight * 0.92, width * 0.3));
  return { width, height, isPortrait, groundY, doorHeight, spacing };
}

export interface DoorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function doorBox(world: World, index: number, layout: ForestLayout): DoorBox {
  const height = Math.round(layout.doorHeight * world.scale);
  const width = Math.round((height * world.width) / world.height);
  return {
    left: Math.round(layout.spacing * index - width / 2),
    top: layout.groundY - height,
    width,
    height,
  };
}

/** Posición de la cámara con esa puerta exactamente en el centro. */
export const cameraFor = (index: number, layout: ForestLayout) =>
  layout.spacing * index - layout.width / 2;

export type DecorationName =
  | 'flor-1'
  | 'flor-2'
  | 'hierba'
  | 'cristales'
  | 'roca'
  | 'roca-musgo-1'
  | 'roca-musgo-2'
  | 'loto'
  | 'cascada'
  | 'reflejo';

export const DECORATION_SIZES: Record<DecorationName, [number, number]> = {
  'flor-1': [226, 134],
  'flor-2': [144, 118],
  hierba: [108, 182],
  cristales: [118, 168],
  roca: [140, 150],
  'roca-musgo-1': [424, 126],
  'roca-musgo-2': [166, 132],
  loto: [192, 128],
  cascada: [436, 134],
  reflejo: [298, 122],
};

export interface Decoration {
  name: DecorationName;
  /** Centro, en pasos de puerta. */
  at: number;
  /** Altura de la base respecto al suelo, en fracciones del alto de una puerta. */
  lift: number;
  /** Ancho en fracciones del alto de una puerta. */
  size: number;
  sways?: boolean;
  /** Va delante de las puertas. */
  front?: boolean;
}

/** Lo que crece entre dos puertas: el patrón se repite, así que un mundo nuevo ya tiene su paisaje. */
const GAP_PATTERN: Omit<Decoration, 'at'>[][] = [
  [
    { name: 'roca-musgo-2', lift: 0.02, size: 0.26 },
    { name: 'flor-1', lift: -0.01, size: 0.3, sways: true, front: true },
  ],
  [
    { name: 'hierba', lift: 0, size: 0.12, sways: true },
    { name: 'cristales', lift: -0.02, size: 0.16, front: true },
    { name: 'flor-2', lift: -0.06, size: 0.2, sways: true, front: true },
  ],
  [
    { name: 'roca', lift: 0.01, size: 0.18 },
    { name: 'hierba', lift: -0.02, size: 0.14, sways: true, front: true },
    { name: 'flor-2', lift: -0.05, size: 0.17, sways: true, front: true },
  ],
];

const WATER_PATTERN: Omit<Decoration, 'at'>[] = [
  { name: 'loto', lift: -0.42, size: 0.28, sways: true },
  { name: 'cascada', lift: -0.22, size: 0.62 },
  { name: 'reflejo', lift: -0.5, size: 0.5 },
  { name: 'loto', lift: -0.34, size: 0.22, sways: true },
];

export function decorationsFor(count: number): Decoration[] {
  const items: Decoration[] = [];
  for (let gap = -1; gap < count; gap += 1) {
    const pattern = GAP_PATTERN[(gap + GAP_PATTERN.length) % GAP_PATTERN.length]!;
    pattern.forEach((item, position) => {
      items.push({ ...item, at: gap + 0.5 + (position - 1) * 0.09 });
    });
    const water = WATER_PATTERN[(gap + WATER_PATTERN.length) % WATER_PATTERN.length]!;
    items.push({ ...water, at: gap + 0.5 });
  }
  return items;
}

/** Física de la cámara: sigue al dedo y, al soltar, llega amortiguada a la puerta sin pasarse. */
export class ForestCamera {
  x = 0;
  velocity = 0;
  target = 0;
  isDragging = false;

  private static readonly STIFFNESS = 6.5;
  private static readonly RUBBER = 0.28;

  constructor(
    private min: number,
    private max: number,
  ) {}

  setBounds(min: number, max: number): void {
    this.min = min;
    this.max = max;
  }

  jumpTo(x: number): void {
    this.x = x;
    this.target = x;
    this.velocity = 0;
  }

  /** Desplaza con el dedo; pasado el primer y el último mundo cuesta más. */
  dragBy(delta: number): void {
    const outside = this.x < this.min || this.x > this.max;
    this.x += outside ? delta * ForestCamera.RUBBER : delta;
  }

  step(deltaSeconds: number): void {
    if (this.isDragging) return;
    const omega = ForestCamera.STIFFNESS;
    const acceleration = omega * omega * (this.target - this.x) - 2 * omega * this.velocity;
    this.velocity += acceleration * deltaSeconds;
    this.x += this.velocity * deltaSeconds;
    if (Math.abs(this.target - this.x) < 0.05 && Math.abs(this.velocity) < 0.5) {
      this.x = this.target;
      this.velocity = 0;
    }
  }
}
