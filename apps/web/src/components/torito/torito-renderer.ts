import { FRAGMENT_SHADER, VERTEX_SHADER } from './torito-shaders';

const IMAGE_WIDTH = 1122;
const IMAGE_HEIGHT = 1402;
const HEAD_CENTER = { x: 790, y: 340 };
const MAX_PIXEL_RATIO = 2;
const MOTE_COUNT = 26;

export interface ToritoTemperament {
  /** Segundos medios entre parpadeos. */
  blinkEvery: number;
  /** Cuánto se mueve solo. */
  liveliness: number;
  /** Segundos medios entre movimientos de oreja. */
  earEvery: number;
}

export type BirthStage = 'forming' | 'painting' | 'waking';
export type ToritoBodyColor = readonly [number, number, number];

export interface ToritoRenderOptions {
  /** Solo el torito, con fondo transparente, para ponerlo sobre otra escena. */
  sprite?: boolean;
  /** Parte de la imagen que se dibuja, en sus píxeles: x, y, ancho y alto. */
  view?: readonly [number, number, number, number];
  /** Color del cuerpo de 0 a 1; sin él se ve el rojo original. */
  color?: ToritoBodyColor | null;
}

/** Recorte ajustado al torito, para las figuras. */
export const TORITO_VIEW = [90, 80, 930, 1040] as const;

interface Assets {
  image: HTMLImageElement;
  mask: HTMLImageElement;
  fill: HTMLImageElement;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  spin: number;
  color: string;
  sparkle: boolean;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const progress = (t: number, start: number, end: number) => clamp((t - start) / (end - start));
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

const assetRequests = new Map<string, Promise<Assets>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}

/** Se descargan una vez aunque haya varios toritos en pantalla. */
export function loadToritoAssets(basePath: string): Promise<Assets> {
  let request = assetRequests.get(basePath);
  if (!request) {
    request = Promise.all([
      loadImage(`${basePath}/base.webp`),
      loadImage(`${basePath}/mask.png`),
      loadImage(`${basePath}/fill.webp`),
    ]).then(([image, mask, fill]) => ({ image, mask, fill }));
    assetRequests.set(basePath, request);
  }
  return request;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL sin shaders');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Error al compilar el shader');
  }
  return shader;
}

/** Duración total del nacimiento, en segundos. */
const BIRTH_SECONDS = 13.5;
const REDUCED_BIRTH_SECONDS = 1.6;

/**
 * Da vida a la ilustración: `waiting` (arcilla por formarse) → `birth` → `alive`.
 * Con movimiento reducido no hay brisa ni movimientos solos, solo un fundido y las reacciones.
 */
export class ToritoRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly overlay: CanvasRenderingContext2D;
  private readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  private readonly hitMask: { data: Uint8ClampedArray; width: number; height: number };
  private frame = 0;
  private isPaused = false;
  private lastFrameAt = 0;
  private time = 0;

  private mode: 'waiting' | 'birth' | 'alive' = 'waiting';
  private birthTime = 0;
  private lastStage: BirthStage | null = null;
  private burstDone = false;
  onStage: ((stage: BirthStage) => void) | null = null;
  onBorn: (() => void) | null = null;
  onContextLost: (() => void) | null = null;

  private readonly values = {
    uAmbient: 1,
    uBlink: 1,
    uHead: 0,
    uNod: 0,
    uEarLeft: 0,
    uEarRight: 0,
    uBreath: 0,
    uPulse: 0,
    uHide: 1,
    uDusk: 1,
    uGlow: 0.6,
    uRise: 0,
    uScale: 0.62,
    uPaint: 0,
    uSprite: 0,
    uRecolor: 0,
  };
  private readonly view: readonly [number, number, number, number];
  private look = { x: 0, y: 0 };
  private lookTarget = { x: 0, y: 0 };
  private headTarget = 0;
  private pointerUntil = 0;
  private nextBlinkAt = 2;
  private blinkAt = -10;
  private secondBlink = false;
  private nextEarAt = 4;
  private earAt = -10;
  private earSide: 'left' | 'right' = 'left';
  private happyAt = -10;
  private nextGlanceAt = 3;
  private particles: Particle[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly particleCanvas: HTMLCanvasElement,
    assets: Assets,
    private temperament: ToritoTemperament,
    private readonly reducedMotion: boolean,
    options: ToritoRenderOptions = {},
  ) {
    const isSprite = options.sprite ?? false;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: isSprite });
    const overlay = particleCanvas.getContext('2d');
    if (!gl || !overlay) throw new Error('Este navegador no permite WebGL');
    this.gl = gl;
    this.overlay = overlay;
    this.view = options.view ?? [0, 0, IMAGE_WIDTH, IMAGE_HEIGHT];
    this.values.uAmbient = reducedMotion ? 0 : 1;
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.setup(assets);
    this.setColor(options.color ?? null);
    this.hitMask = this.readHitMask(assets.mask);
    if (isSprite) {
      this.values.uSprite = 1;
      this.values.uAmbient = 0;
      this.finishBirth();
    } else {
      this.spawnMotes();
    }
  }

  private setup(assets: Assets): void {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL sin programa');
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Error al enlazar el programa');
    }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    for (const name of [...Object.keys(this.values), 'uTime', 'uLook', 'uBody']) {
      this.uniforms.set(name, gl.getUniformLocation(program, name));
    }
    gl.uniform4f(gl.getUniformLocation(program, 'uView'), ...this.view);
    (['image', 'mask', 'fill'] as const).forEach((key, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, assets[key]);
      const name = `u${key[0]!.toUpperCase()}${key.slice(1)}`;
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
  }

  private readHitMask(mask: HTMLImageElement) {
    const scratch = document.createElement('canvas');
    scratch.width = Math.round(mask.width / 4);
    scratch.height = Math.round(mask.height / 4);
    const context = scratch.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D no disponible');
    context.drawImage(mask, 0, 0, scratch.width, scratch.height);
    const { data } = context.getImageData(0, 0, scratch.width, scratch.height);
    return { data, width: scratch.width, height: scratch.height };
  }

  start(): void {
    this.resize();
    this.lastFrameAt = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastFrameAt) / 1000);
      this.lastFrameAt = now;
      if (!this.isPaused) {
        this.time += dt;
        this.update(dt);
        this.draw();
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.draw();
    this.frame = requestAnimationFrame(loop);
  }

  /** Quieto y sin gastar batería: se queda en el último cuadro dibujado. */
  setPaused(isPaused: boolean): void {
    this.isPaused = isPaused;
  }

  /** Libera el contexto WebGL: el navegador solo permite unos pocos a la vez. */
  release(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** Dibuja un cuadro fuera de pantalla y lo devuelve como imagen. */
  snapshot(width: number, height: number): string {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.draw();
    return this.canvas.toDataURL('image/png');
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
  }

  /** El celular puede quitar WebGL al pasar a segundo plano. */
  private readonly handleContextLost = () => {
    cancelAnimationFrame(this.frame);
    this.onContextLost?.();
  };

  resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const { width, height } = this.canvas.getBoundingClientRect();
    for (const target of [this.canvas, this.particleCanvas]) {
      target.width = Math.max(1, Math.round(width * ratio));
      target.height = Math.max(1, Math.round(height * ratio));
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // Cambiar el tamaño borra el lienzo; en pausa nadie volvería a dibujarlo.
    if (this.isPaused) this.draw();
  }

  setTemperament(temperament: ToritoTemperament): void {
    this.temperament = temperament;
  }

  setColor(color: ToritoBodyColor | null): void {
    this.values.uRecolor = color ? 1 : 0;
    if (color) this.gl.uniform3f(this.uniforms.get('uBody') ?? null, ...color);
  }

  /** Vuelve a la arcilla, lista para `playBirth`. */
  reset(): void {
    this.mode = 'waiting';
    this.birthTime = 0;
    this.lastStage = null;
    this.burstDone = false;
    Object.assign(this.values, {
      uHide: 1,
      uDusk: 1,
      uGlow: 0.6,
      uRise: 0,
      uScale: 0.62,
      uPaint: 0,
      uBlink: 1,
      uHead: 0,
      uNod: 0,
    });
  }

  playBirth(): void {
    this.reset();
    this.mode = 'birth';
  }

  skipBirth(): void {
    if (this.mode === 'birth') this.finishBirth();
  }

  private finishBirth(): void {
    this.mode = 'alive';
    Object.assign(this.values, {
      uHide: 0,
      uDusk: 0,
      uGlow: 0,
      uRise: 1,
      uScale: 1,
      uPaint: 1,
      uBlink: 0,
      uHead: 0,
    });
    this.nextBlinkAt = this.time + 2;
    this.onBorn?.();
  }

  private toImage(x: number, y: number) {
    const [viewX, viewY, viewWidth, viewHeight] = this.view;
    return { px: viewX + x * viewWidth, py: viewY + y * viewHeight };
  }

  /** `x`/`y` de 0 a 1 sobre el canvas. */
  isOverTorito(x: number, y: number): boolean {
    const { px, py } = this.toImage(x, y);
    const col = Math.floor((px / IMAGE_WIDTH) * this.hitMask.width);
    const row = Math.floor((py / IMAGE_HEIGHT) * this.hitMask.height);
    return (this.hitMask.data[(row * this.hitMask.width + col) * 4] ?? 0) > 100;
  }

  /** Saluda: entrecierra los ojos, asiente, mueve las orejas y suelta destellos. */
  greet(): void {
    if (this.mode !== 'alive') return;
    this.happyAt = this.time;
    this.burst(HEAD_CENTER.x, HEAD_CENTER.y - 60, 12);
  }

  /** `x`/`y` de 0 a 1 sobre el canvas. */
  pointerAt(x: number, y: number): void {
    if (this.mode !== 'alive') return;
    const { px, py } = this.toImage(x, y);
    this.lookTarget = {
      x: clamp((px - HEAD_CENTER.x) / 380, -1, 1),
      y: clamp((py - HEAD_CENTER.y) / 380, -1, 1),
    };
    this.headTarget = clamp((px - HEAD_CENTER.x) / 560, -1, 1) * 0.038;
    this.pointerUntil = this.time + 2.2;
  }

  /** Devuelve si el toque cayó sobre el torito. */
  tapAt(x: number, y: number): boolean {
    if (this.mode !== 'alive') return false;
    this.pointerAt(x, y);
    const { px, py } = this.toImage(x, y);
    const isTorito = this.isOverTorito(x, y);
    if (isTorito) {
      this.happyAt = this.time;
      this.burst(px, py, 14);
    } else {
      this.burst(px, py, 5);
    }
    return isTorito;
  }

  private update(dt: number): void {
    if (this.mode === 'birth') this.updateBirth(dt);
    else if (this.mode === 'waiting') {
      this.values.uGlow = 0.55 + 0.12 * Math.sin(this.time * 1.6);
    } else this.updateAlive(dt);
    this.updateParticles(dt);
  }

  private updateBirth(dt: number): void {
    this.birthTime += dt;
    const v = this.values;
    if (this.reducedMotion) {
      const fade = easeInOut(progress(this.birthTime, 0, REDUCED_BIRTH_SECONDS));
      v.uRise = 1;
      v.uScale = 1;
      v.uPaint = 1;
      v.uBlink = 0;
      v.uDusk = 1 - fade;
      v.uGlow = 0.6 * (1 - fade);
      v.uHide = 1 - fade;
      if (this.birthTime >= REDUCED_BIRTH_SECONDS) this.finishBirth();
      return;
    }

    const t = this.birthTime;
    v.uRise = easeInOut(progress(t, 0.4, 5));
    v.uScale = 0.62 + 0.38 * easeOutBack(progress(t, 0.6, 5.4));
    v.uPaint = easeInOut(progress(t, 5, 9.6));
    v.uDusk = 1 - easeInOut(progress(t, 8.2, 11));
    v.uGlow = (0.6 + 0.55 * Math.sin(progress(t, 0, 7) * Math.PI)) * (1 - progress(t, 7.5, 10.5));
    v.uHide = 1 - easeInOut(progress(t, 10.6, 11.2));
    v.uHead = -0.05 * (1 - easeInOut(progress(t, 9.6, 12)));
    v.uBreath = Math.sin(t * 1.4) * progress(t, 8, 11);

    // Abre los ojos despacio: un intento, se cierran y se abren del todo.
    if (t < 11.3) v.uBlink = 1;
    else if (t < 11.9) v.uBlink = 1 - 0.55 * easeInOut(progress(t, 11.3, 11.9));
    else if (t < 12.2) v.uBlink = 0.45 + 0.55 * easeInOut(progress(t, 11.9, 12.2));
    else v.uBlink = 1 - easeInOut(progress(t, 12.2, 12.8));

    const stage: BirthStage = t < 5 ? 'forming' : t < 11 ? 'painting' : 'waking';
    if (stage !== this.lastStage) {
      this.lastStage = stage;
      this.onStage?.(stage);
    }
    if (t < 7.5 && Math.random() < dt * 9) this.ember();
    if (!this.burstDone && t >= 12.7) {
      this.burstDone = true;
      this.burst(HEAD_CENTER.x, HEAD_CENTER.y, 26);
    }
    if (t >= BIRTH_SECONDS) this.finishBirth();
  }

  private updateAlive(dt: number): void {
    const v = this.values;
    const { liveliness } = this.temperament;
    const t = this.time;
    const motion = this.reducedMotion ? 0 : 1;

    const happy = Math.exp(-(t - this.happyAt) * 2.6) * (t >= this.happyAt ? 1 : 0);
    v.uBreath = motion * Math.sin((t * 2 * Math.PI) / 4.2);
    v.uPulse = happy * (0.6 + 0.4 * Math.sin((t - this.happyAt) * 14));
    v.uNod = motion * happy * Math.sin((t - this.happyAt) * 11) * 7;

    const isFollowing = t < this.pointerUntil;
    if (!isFollowing && t >= this.nextGlanceAt) {
      this.nextGlanceAt = t + 2.5 + Math.random() * 4;
      this.lookTarget = { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 0.7 };
    }
    const wander =
      motion * liveliness * (Math.sin(t * 0.35) * 0.02 + Math.sin(t * 0.13 + 1) * 0.014);
    const target = isFollowing ? this.headTarget : wander;
    const ease = 1 - Math.exp(-dt * 3.5);
    v.uHead +=
      (target + motion * happy * 0.025 * Math.sin((t - this.happyAt) * 7) - v.uHead) * ease;
    const lookEase = 1 - Math.exp(-dt * 7);
    this.look.x += (this.lookTarget.x - this.look.x) * lookEase;
    this.look.y += (this.lookTarget.y - this.look.y) * lookEase;

    if (!this.reducedMotion && t >= this.nextBlinkAt) {
      this.blinkAt = t;
      this.secondBlink = Math.random() < 0.22;
      this.nextBlinkAt =
        t +
        this.temperament.blinkEvery * (0.6 + Math.random() * 0.8) +
        (this.secondBlink ? 0.4 : 0);
    }
    const sinceBlink = t - this.blinkAt;
    const blinkShape = (s: number) =>
      s < 0 ? 0 : s < 0.08 ? s / 0.08 : s < 0.13 ? 1 : s < 0.28 ? 1 - (s - 0.13) / 0.15 : 0;
    const blink = Math.max(
      blinkShape(sinceBlink),
      this.secondBlink ? blinkShape(sinceBlink - 0.32) : 0,
    );
    v.uBlink = Math.max(blink, happy * 0.62);

    if (!this.reducedMotion && t >= this.nextEarAt) {
      this.earAt = t;
      this.earSide = Math.random() < 0.6 ? 'left' : 'right';
      this.nextEarAt = t + this.temperament.earEvery * (0.6 + Math.random() * 0.8);
    }
    const flick = Math.exp(-(t - this.earAt) * 4) * Math.sin((t - this.earAt) * 16);
    const earMotion = motion * flick * 0.11;
    const earHappy = motion * happy * Math.sin((t - this.happyAt) * 16) * 0.14;
    v.uEarLeft = (this.earSide === 'left' ? earMotion : 0) + earHappy;
    v.uEarRight = (this.earSide === 'right' ? earMotion : 0) - earHappy;
  }

  private spawnMotes(): void {
    for (let i = 0; i < MOTE_COUNT; i += 1) this.particles.push(this.mote());
  }

  private mote(): Particle {
    return {
      x: Math.random() * IMAGE_WIDTH,
      y: Math.random() * IMAGE_HEIGHT,
      vx: (Math.random() - 0.5) * 14,
      vy: -5 - Math.random() * 12,
      size: 1.6 + Math.random() * 2.6,
      life: 0,
      maxLife: 5 + Math.random() * 7,
      spin: Math.random() * 6,
      color: '255, 226, 160',
      sparkle: false,
    };
  }

  private ember(): void {
    this.particles.push({
      x: 180 + Math.random() * 720,
      y: 1040 + Math.random() * 60,
      vx: (Math.random() - 0.5) * 30,
      vy: -60 - Math.random() * 90,
      size: 1.6 + Math.random() * 2.4,
      life: 0,
      maxLife: 1.6 + Math.random() * 1.6,
      spin: 0,
      color: '255, 170, 90',
      sparkle: false,
    });
  }

  private burst(x: number, y: number, count: number): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 170;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 5 + Math.random() * 7,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.8,
        spin: Math.random() * 6,
        color: Math.random() < 0.5 ? '255, 214, 130' : '184, 100, 63',
        sparkle: true,
      });
    }
  }

  private updateParticles(dt: number): void {
    const next: Particle[] = [];
    for (const particle of this.particles) {
      particle.life += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.sparkle) {
        particle.vy += 170 * dt;
        particle.spin += dt * 5;
      }
      if (particle.life < particle.maxLife) next.push(particle);
      else if (!particle.sparkle && particle.color === '255, 226, 160') next.push(this.mote());
    }
    this.particles = next;
  }

  private draw(): void {
    const gl = this.gl;
    gl.uniform1f(this.uniforms.get('uTime') ?? null, this.time);
    gl.uniform2f(this.uniforms.get('uLook') ?? null, this.look.x, this.look.y);
    for (const [name, value] of Object.entries(this.values)) {
      gl.uniform1f(this.uniforms.get(name) ?? null, value);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.drawParticles();
  }

  private drawParticles(): void {
    const { overlay, particleCanvas } = this;
    overlay.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const [viewX, viewY, viewWidth, viewHeight] = this.view;
    const scaleX = particleCanvas.width / viewWidth;
    const scaleY = particleCanvas.height / viewHeight;
    for (const particle of this.particles) {
      if (this.reducedMotion && !particle.sparkle) continue;
      const age = particle.life / particle.maxLife;
      const alpha = Math.sin(age * Math.PI) * (particle.sparkle ? 1 : 0.75);
      overlay.save();
      overlay.translate((particle.x - viewX) * scaleX, (particle.y - viewY) * scaleY);
      overlay.fillStyle = `rgba(${particle.color}, ${alpha})`;
      if (particle.sparkle) {
        // El rombo de la marca.
        overlay.rotate(particle.spin);
        const size = particle.size * scaleX * (1 - age * 0.4);
        overlay.beginPath();
        overlay.moveTo(0, -size);
        overlay.lineTo(size * 0.62, 0);
        overlay.lineTo(0, size);
        overlay.lineTo(-size * 0.62, 0);
        overlay.closePath();
        overlay.fill();
      } else {
        overlay.beginPath();
        overlay.arc(0, 0, particle.size * scaleX, 0, Math.PI * 2);
        overlay.fill();
      }
      overlay.restore();
    }
  }
}
