const MAX_PIXEL_RATIO = 2;
const FIREFLY_AREA = 22_000;
const MAX_FIREFLIES = 70;
const FIREFLY_DEPTH = 0.55;
const SPRITE_SIZE = 64;
const GRAVITY = 26;

interface Firefly {
  x: number;
  y: number;
  size: number;
  phase: number;
  drift: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
}

function glowSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const context = sprite.getContext('2d');
  if (context) {
    const center = SPRITE_SIZE / 2;
    const glow = context.createRadialGradient(center, center, 0, center, center, center);
    glow.addColorStop(0, 'rgba(255, 244, 200, 1)');
    glow.addColorStop(0.18, 'rgba(255, 196, 92, 0.85)');
    glow.addColorStop(0.5, 'rgba(255, 160, 60, 0.18)');
    glow.addColorStop(1, 'rgba(255, 150, 50, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  }
  return sprite;
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** Luciérnagas y chispas, en un solo canvas para no tocar el DOM en cada fotograma. */
export class ForestParticles {
  private readonly context: CanvasRenderingContext2D | null;
  private readonly sprite = glowSprite();
  private fireflies: Firefly[] = [];
  private sparks: Spark[] = [];
  private width = 0;
  private height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  resize(width: number, height: number): void {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(MAX_FIREFLIES, Math.round((width * height) / FIREFLY_AREA));
    this.fireflies = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: height * (0.15 + Math.random() * 0.75),
      size: 5 + Math.random() * 9,
      phase: Math.random() * Math.PI * 2,
      drift: 0.3 + Math.random() * 0.7,
    }));
  }

  /** Lluvia de chispas al abrirse una puerta. */
  burst(x: number, y: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 190;
      const ttl = 0.8 + Math.random() * 1.1;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: ttl,
        ttl,
        size: 6 + Math.random() * 14,
      });
    }
  }

  draw(seconds: number, deltaSeconds: number, cameraX: number): void {
    const { context, sprite, width, height } = this;
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    for (const firefly of this.fireflies) {
      const breath = Math.sin(seconds * firefly.drift * 1.7 + firefly.phase);
      const x = wrap(
        firefly.x +
          Math.sin(seconds * 0.23 * firefly.drift + firefly.phase) * 34 -
          cameraX * FIREFLY_DEPTH,
        width + 40,
      );
      const y = firefly.y + Math.cos(seconds * 0.31 * firefly.drift + firefly.phase) * 22;
      context.globalAlpha = 0.25 + (breath + 1) * 0.3;
      const size = firefly.size * (0.8 + (breath + 1) * 0.2);
      context.drawImage(sprite, x - 20 - size / 2, y - size / 2, size, size);
    }
    this.sparks = this.sparks.filter((spark) => spark.life > 0);
    for (const spark of this.sparks) {
      spark.life -= deltaSeconds;
      spark.vy += GRAVITY * deltaSeconds;
      spark.x += spark.vx * deltaSeconds;
      spark.y += spark.vy * deltaSeconds;
      context.globalAlpha = Math.max(0, spark.life / spark.ttl);
      context.drawImage(
        sprite,
        spark.x - spark.size / 2,
        spark.y - spark.size / 2,
        spark.size,
        spark.size,
      );
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }
}

/** El cielo se pinta una sola vez: las estrellas no necesitan redibujarse. */
export function paintStars(canvas: HTMLCanvasElement, width: number, height: number): void {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(ratio, ratio);
  const count = Math.round((width * height) / 2600);
  for (let index = 0; index < count; index += 1) {
    const big = Math.random() > 0.94;
    context.globalAlpha = 0.25 + Math.random() * 0.65;
    context.fillStyle = Math.random() > 0.8 ? '#ffe9c4' : '#dfe6ff';
    context.beginPath();
    context.arc(
      Math.random() * width,
      Math.random() * height,
      big ? 1.3 : 0.4 + Math.random() * 0.5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}
