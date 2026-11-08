import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { buildGrove, doorAngle, FENCE_RADIUS, GROVE_RING, preloadGroveTextures } from './grove';
import {
  buildToritos,
  toritosHasModels,
  toritosHeight,
  toritosOpenGround,
  TORITOS_ID,
  TORITOS_SKY_ROTATION,
  TORITOS_SUN_DIR,
  type ToritosSign,
} from './toritos';
import { preloadToritosAssets, toritosAssets } from './toritos-assets';
import { HUB_ID, themeFor, type TreeStyle, type WorldTheme } from './worlds';

/** Grano de película y viñeta suave: acabado de stop-motion. */
const GRAIN_SHADER = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float n = fract(sin(dot(vUv * vec2(1024.0, 768.0) + fract(uTime * 7.0) * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * 0.018;
      float v = smoothstep(0.92, 0.3, length(vUv - 0.5));
      c.rgb *= mix(0.68, 1.0, v);
      gl_FragColor = c;
    }
  `,
};

/** Una puerta del bosque: lleva al mundo `id` (categoría de la intención). */
export interface DoorSpec {
  id: string;
  label: string;
  stones: string;
  /** La puerta no lleva a un mundo 3D sino a otra página (p. ej. "Tu cielo"). */
  portal?: boolean;
}

export type NearTarget =
  { kind: 'door'; id: string } | { kind: 'return' } | { kind: 'tree'; id: string };

export interface EngineCallbacks {
  onProgress?(value: number): void;
  onNear?(target: NearTarget | null): void;
  onWorld?(worldId: string): void;
  /** Color del velo de transición al cruzar una puerta; `null` para retirarlo. */
  onTransition?(color: string | null): void;
  onLockChange?(locked: boolean): void;
  /** Se cruzó una puerta-portal: la interfaz navega a su página. */
  onPortal?(id: string): void;
}

export interface EngineOptions {
  doors: DoorSpec[];
  returnLabel: string;
  returnHint: string;
  /** Calidad reducida (móviles y equipos modestos). */
  low: boolean;
  /** Cartel del mundo de los toritos. */
  toritosSign: ToritosSign;
}

interface Collider {
  x: number;
  z: number;
  r: number;
}

interface DoorRuntime {
  target: NearTarget;
  inverse: THREE.Matrix4;
  /** `null`: se entra cruzando el arco. Número: se entra al acercarse a menos de esa distancia (puerta en un tronco). */
  reach: number | null;
  glow: number;
  setGlow(value: number): void;
  open?(): void;
}

const EYE = 1.7;
const WALK = 4.2;
const RUN = 7.6;
const DOOR_RING = GROVE_RING;
const LOOK_SPEED = 0.0022;
const TOUCH_LOOK_SPEED = 0.0055;

/* ------------------------------------------------------------------ utilidades */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function pick<T>(list: readonly T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)] as T;
}

function archShape(width: number, height: number): THREE.Shape {
  const r = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-r, 0);
  shape.lineTo(r, 0);
  shape.lineTo(r, height - r);
  shape.absarc(0, height - r, r, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  return shape;
}

/** Material estándar cuyo color de instancia también emite luz (cristales que brillan). */
function glowMaterial(
  glow: number,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.18,
    metalness: 0.05,
    flatShading: true,
    ...extra,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * ${glow.toFixed(3)};`,
    );
  };
  material.customProgramCacheKey = () => `glow-${glow}`;
  return material;
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  rotation: THREE.Euler,
  scale: THREE.Vector3,
  color?: THREE.Color,
): void {
  const m = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(rotation),
    scale,
  );
  mesh.setMatrixAt(index, m);
  if (color) mesh.setColorAt(index, color);
}

/* ------------------------------------------------------------------ shaders */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.5)) : mix(uHorizon, uBottom, pow(-h, 0.35));
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    c += uSun * (pow(s, 600.0) * 6.0 + pow(s, 14.0) * 0.45 + pow(s, 3.0) * 0.12);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const GRASS_VERTEX = /* glsl */ `
  uniform float uTime;
  attribute vec3 aTip;
  attribute float aPhase;
  varying vec3 vTip;
  varying float vH;
  varying float vSide;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vH = uv.y;
    vSide = uv.x;
    vTip = aTip;
    vec3 pos = position;
    // Curvatura natural de la brizna.
    pos.z += vH * vH * (0.18 + fract(aPhase * 7.1) * 0.3);
    vec4 world = instanceMatrix * vec4(pos, 1.0);
    float sway = sin(uTime * 1.3 + aPhase + world.x * 0.15 + world.z * 0.11) * 0.14
      + sin(uTime * 2.9 + aPhase * 2.0) * 0.035;
    world.x += sway * vH * vH;
    world.z += sway * 0.6 * vH * vH;
    vWorld = world.xyz;
    vec4 mvPosition = modelViewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAmbient;
  uniform vec3 uSun;
  uniform vec3 uLampColor;
  uniform vec4 uLamps[12];
  uniform int uLampCount;
  varying vec3 vTip;
  varying float vH;
  varying float vSide;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  void main() {
    vec3 c = mix(uBase, vTip, smoothstep(0.0, 1.0, vH));
    // Nervio central más claro, bordes más oscuros.
    c *= 0.8 + 0.3 * (1.0 - abs(vSide - 0.5) * 2.0);
    vec3 light = uAmbient + uSun * (0.3 + 0.7 * vH);
    for (int i = 0; i < 12; i++) {
      if (i >= uLampCount) break;
      vec3 d = uLamps[i].xyz - vWorld;
      light += uLampColor * uLamps[i].w / (1.0 + dot(d, d) * 0.22) * (0.35 + 0.65 * vH);
    }
    gl_FragColor = vec4(c * light, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const PORTAL_VERTEX = /* glsl */ `
  uniform vec2 uSize;
  varying vec2 vUv;
  void main() {
    vUv = vec2(position.x / uSize.x + 0.5, position.y / uSize.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PORTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform float uBoost;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 p = vUv - vec2(0.5, 0.42);
    p.x *= 0.62;
    float r = length(p);
    float a = atan(p.y, p.x);
    float s1 = sin(a * 3.0 + r * 16.0 - uTime * 1.4) * 0.5 + 0.5;
    float s2 = sin(a * 5.0 - r * 10.0 + uTime * 0.9) * 0.5 + 0.5;
    vec3 c = mix(uA, uB, s1 * 0.65 + s2 * 0.35);
    c = mix(c, uC, smoothstep(0.35, 0.0, r) * 0.6);
    c += vec3(1.0) * pow(1.0 - clamp(r * 2.2, 0.0, 1.0), 4.0) * 1.4;
    vec2 cell = floor(vUv * vec2(40.0, 70.0));
    float tw = hash(cell + floor(uTime * 3.0));
    c += step(0.985, tw) * 1.5;
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    gl_FragColor = vec4(c * (1.0 + uBoost) * (0.75 + 0.25 * edge), 1.0);
  }
`;

const PARTICLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uStyle;
  uniform float uHeight;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    float t = uTime;
    vSeed = aSeed;
    if (uStyle < 0.5) {
      p.x += sin(t * 0.35 + aSeed * 12.0) * 1.6;
      p.y += sin(t * 0.6 + aSeed * 7.0) * 0.7;
      p.z += cos(t * 0.3 + aSeed * 9.0) * 1.6;
      vAlpha = 0.25 + 0.75 * pow(sin(t * (1.2 + aSeed) + aSeed * 30.0) * 0.5 + 0.5, 3.0);
    } else if (uStyle < 1.5) {
      p.y = mod(p.y - t * (0.5 + aSeed * 0.5), uHeight);
      p.x += sin(t * 0.7 + aSeed * 20.0) * 1.4 + sin(t * 0.21 + aSeed) * 2.0;
      p.z += cos(t * 0.5 + aSeed * 14.0) * 1.0;
      vAlpha = 0.9;
    } else if (uStyle < 2.5) {
      p.y = mod(p.y + t * (0.15 + aSeed * 0.25), uHeight);
      p.x += sin(t * 0.4 + aSeed * 10.0) * 0.6;
      p.z += cos(t * 0.3 + aSeed * 8.0) * 0.6;
      vAlpha = 0.3 + 0.7 * (sin(t * 2.0 + aSeed * 40.0) * 0.5 + 0.5);
    } else {
      // Nieve: cae despacio y se mece.
      p.y = mod(p.y - t * (0.55 + aSeed * 0.6), uHeight);
      p.x += sin(t * 0.5 + aSeed * 17.0) * 0.8;
      p.z += cos(t * 0.37 + aSeed * 11.0) * 0.8;
      vAlpha = 0.85;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uPixelRatio * (60.0 / -mv.z);
    // Copos de nieve siempre pequeños y nítidos, también los que pasan cerca de la cámara.
    if (uStyle > 2.5) gl_PointSize = clamp(gl_PointSize, 1.5 * uPixelRatio, 5.0 * uPixelRatio);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStyle;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    if (uStyle > 0.5 && uStyle < 1.5) {
      float ang = vSeed * 6.2831;
      q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
      q.x *= 1.9;
    }
    float d = length(q);
    float a = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.18, 0.0, d);
    // La nieve no lleva núcleo brillante (sin "orbes").
    vec3 c = uColor * (1.0 + core * (uStyle > 2.5 ? 0.0 : 2.5));
    gl_FragColor = vec4(c, a * vAlpha);
  }
`;

/* ------------------------------------------------------------------ motor */

export class WorldEngine {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grain: ShaderPass;
  private envMap: THREE.Texture;
  private toritosEnv: THREE.Texture | null = null;

  private makeToritosEnv(hdr: THREE.DataTexture): THREE.Texture {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.toritosEnv = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
    return this.toritosEnv;
  }
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private world: THREE.Group | null = null;
  private sky: THREE.Mesh | null = null;
  private updaters: ((time: number, dt: number) => void)[] = [];
  private colliders: Collider[] = [];
  private doors: DoorRuntime[] = [];
  private treeSpot: THREE.Vector3 | null = null;
  private lampPoints: THREE.Vector3[] = [];
  private worldId = HUB_ID;
  private bound = 110;
  private flatRadius = 24;
  private hasPath = true;

  private position = new THREE.Vector3(0, 0, 17);
  private velocity = new THREE.Vector2();
  private yaw = 0;
  private pitch = 0;
  private bob = 0;
  private keys = new Set<string>();
  private stick = new THREE.Vector2();
  private turn = 0;
  private near: NearTarget | null = null;
  private transitioning = false;
  private locked = false;
  private running = false;
  private frame = 0;
  private dragging: { id: number; x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(
    private container: HTMLElement,
    private options: EngineOptions,
    private callbacks: EngineCallbacks = {},
  ) {
    const low = options.low;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !low,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
    this.camera.rotation.order = 'YXZ';

    // Render target con MSAA: sin esto el post-proceso pierde el antialias y todo se ve borroso.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: low ? 0 : 4,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.65, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grain = new ShaderPass(GRAIN_SHADER);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.composer.addPass(this.grain);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.bindInput();
  }

  /** Construye el bosque inicial (con progreso) y empieza a renderizar. */
  async init(): Promise<void> {
    const report = (value: number) => this.callbacks.onProgress?.(value);
    report(0.05);
    await Promise.race([
      Promise.all([
        document.fonts.load('600 96px Fraunces'),
        document.fonts.load('500 40px "DM Sans"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).catch(() => undefined);
    report(0.25);
    await nextFrame();
    await preloadGroveTextures();
    report(0.4);
    this.buildWorld(HUB_ID, report);
    report(0.9);
    await nextFrame();
    this.renderer.compile(this.scene, this.camera);
    report(1);
    this.running = true;
    this.clock.start();
    window.setTimeout(() => void preloadToritosAssets(), 4000);
    this.loop();
  }

  /** Pide el puntero (escritorio) para mirar con el ratón. */
  requestLock(): void {
    if (this.options.low) return;
    const canvas = this.renderer.domElement;
    try {
      const result = canvas.requestPointerLock() as unknown;
      if (result instanceof Promise) result.catch(() => undefined);
    } catch {
      /* algunos navegadores no lo permiten: se mira arrastrando */
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }

  /** Joystick táctil: x derecha, y adelante, en [-1, 1]. */
  /** Botones de giro táctiles: -1 izquierda, 1 derecha, 0 nada. */
  setTurn(value: number): void {
    this.turn = value;
  }

  setStick(x: number, y: number): void {
    this.stick.set(x, y);
  }

  /** Entra a la puerta cercana (tecla E o botón táctil). */
  enterNear(): void {
    const near = this.near;
    if (!near || this.transitioning) return;
    if (near.kind === 'door') this.travel(near.id, HUB_ID);
    else if (near.kind === 'return') this.travel(HUB_ID, this.worldId);
  }

  goHome(): void {
    if (this.worldId !== HUB_ID && !this.transitioning) this.travel(HUB_ID, this.worldId);
  }

  /** Solo para depurar en desarrollo: coloca la cámara o cambia de mundo. */
  debugPlace(x: number, z: number, yaw: number, pitch = 0): void {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = pitch;
  }

  debugTravel(id: string): void {
    this.travel(id, this.worldId);
  }

  setPaused(paused: boolean): void {
    this.running = !paused;
    if (!paused) {
      this.clock.getDelta();
      this.loop();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.unbindInput();
    this.resizeObserver.disconnect();
    this.clearWorld();
    this.composer.dispose();
    this.envMap.dispose();
    this.toritosEnv?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* ------------------------------------------------------------ bucle */

  private loop = (): void => {
    if (!this.running || this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.updatePlayer(dt);
    for (const update of this.updaters) update(time, dt);
    if (this.sky) this.sky.position.copy(this.camera.position);
    (this.grain.uniforms.uTime as { value: number }).value = time;
    this.composer.render(dt);
  };

  private resize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? 80 : 70;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width / 2, height / 2);
  }

  /* ------------------------------------------------------------ jugador */

  private updatePlayer(dt: number): void {
    if (this.transitioning) {
      this.applyCamera(0);
      return;
    }
    // Botones táctiles de giro (rad/s).
    this.yaw -= this.turn * dt * 1.9;
    const k = this.keys;
    let ix = this.stick.x;
    let iy = this.stick.y;
    if (k.has('KeyW') || k.has('ArrowUp')) iy += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iy -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const run =
      k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.y) > 0.92;
    const speed = run ? RUN : WALK;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const tx = (-sin * iy + cos * ix) * speed;
    const tz = (-cos * iy - sin * ix) * speed;
    const ease = 1 - Math.exp(-dt * 8);
    this.velocity.x += (tx - this.velocity.x) * ease;
    this.velocity.y += (tz - this.velocity.y) * ease;

    const prev = this.position.clone();
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.y * dt;
    this.collide();

    const moved = Math.hypot(this.position.x - prev.x, this.position.z - prev.z);
    this.bob += moved * 1.9;
    this.checkDoors(prev);
    this.checkNear();
    this.applyCamera(Math.min(moved / Math.max(dt, 1e-4) / RUN, 1));
  }

  private applyCamera(amount: number): void {
    const ground = this.heightAt(this.position.x, this.position.z);
    const bobY = Math.sin(this.bob) * 0.06 * amount;
    this.position.y = ground;
    this.camera.position.set(this.position.x, ground + EYE + bobY, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bob * 0.5) * 0.004 * amount);
  }

  private collide(): void {
    for (const c of this.colliders) {
      const dx = this.position.x - c.x;
      const dz = this.position.z - c.z;
      const min = c.r + 0.35;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        this.position.x = c.x + (dx / d) * min;
        this.position.z = c.z + (dz / d) * min;
      }
    }
    const d = Math.hypot(this.position.x, this.position.z);
    const limit = this.worldId === HUB_ID ? FENCE_RADIUS - 0.7 : this.bound;
    if (d > limit) {
      this.position.x *= limit / d;
      this.position.z *= limit / d;
    }
  }

  private checkDoors(prev: THREE.Vector3): void {
    for (const door of this.doors) {
      const a = prev.clone().applyMatrix4(door.inverse);
      const b = this.position.clone().applyMatrix4(door.inverse);
      const enter =
        door.reach === null
          ? Math.abs(b.x) < 1.05 && a.z > 0 && b.z <= 0.05 && b.z > -1
          : Math.abs(b.x) < 1.2 && b.z > 0 && b.z < door.reach && b.z < a.z;
      if (enter) {
        if (door.target.kind === 'door') this.travel(door.target.id, HUB_ID);
        else if (door.target.kind === 'return') this.travel(HUB_ID, this.worldId);
        return;
      }
    }
  }

  private checkNear(): void {
    let best: NearTarget | null = null;
    let bestDistance = Infinity;
    for (const door of this.doors) {
      const local = this.position.clone().applyMatrix4(door.inverse);
      const distance = Math.hypot(local.x, local.z);
      const active = local.z > 0 && distance < (door.reach === null ? 5.5 : 7.5);
      door.glow = THREE.MathUtils.lerp(door.glow, active ? 1 : 0, 0.08);
      door.setGlow(door.glow);
      if (active && distance < bestDistance) {
        best = door.target;
        bestDistance = distance;
      }
    }
    if (!best && this.treeSpot) {
      const d = Math.hypot(this.position.x - this.treeSpot.x, this.position.z - this.treeSpot.z);
      if (d < (this.worldId === TORITOS_ID ? 6 : 9)) best = { kind: 'tree', id: this.worldId };
    }
    if (JSON.stringify(best) !== JSON.stringify(this.near)) {
      this.near = best;
      this.callbacks.onNear?.(best);
    }
  }

  private travel(to: string, from: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.velocity.set(0, 0);
    const theme = themeFor(to);
    const leaving = this.doors.find(
      (door) =>
        (door.target.kind === 'door' && door.target.id === to) ||
        (door.target.kind === 'return' && to === HUB_ID),
    );
    leaving?.open?.();
    const delay = leaving?.open ? 650 : 0;
    window.setTimeout(() => this.callbacks.onTransition?.(theme.sky.horizon), delay);
    if (this.options.doors.some((door) => door.id === to && door.portal)) {
      window.setTimeout(() => this.callbacks.onPortal?.(to), delay + 700);
      return;
    }
    const ready = to === TORITOS_ID ? preloadToritosAssets() : Promise.resolve(null);
    window.setTimeout(async () => {
      await ready;
      if (this.disposed) return;
      this.buildWorld(to);
      if (to === HUB_ID) {
        const index = this.options.doors.findIndex((door) => door.id === from);
        const angle = doorAngle(Math.max(index, 0), this.options.doors.length);
        const r = GROVE_RING - 5.5;
        this.position.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
        this.yaw = angle;
      } else {
        this.position.set(0, 0, 23);
        this.yaw = 0;
      }
      this.pitch = 0.05;
      this.near = null;
      this.callbacks.onNear?.(null);
      this.callbacks.onWorld?.(to);
      this.renderer.compile(this.scene, this.camera);
      window.setTimeout(() => {
        this.transitioning = false;
        this.callbacks.onTransition?.(null);
      }, 250);
    }, delay + 750);
  }

  /* ------------------------------------------------------------ entrada */

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(event.code)
    ) {
      event.preventDefault();
    }
    this.keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'Enter') this.enterNear();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.locked) return;
    this.look(event.movementX * LOOK_SPEED, event.movementY * LOOK_SPEED);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (this.locked) return;
    if (event.pointerType === 'mouse' && !this.options.low) {
      this.requestLock();
    }
    this.dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      this.renderer.domElement.setPointerCapture(event.pointerId);
    } catch {
      /* el puntero ya no está activo */
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.dragging;
    if (!drag || drag.id !== event.pointerId) return;
    this.look(
      (event.clientX - drag.x) * TOUCH_LOOK_SPEED,
      (event.clientY - drag.y) * TOUCH_LOOK_SPEED,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.dragging?.id === event.pointerId) this.dragging = null;
  };

  private onLockChange = (): void => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    if (!this.locked) this.keys.clear();
    this.callbacks.onLockChange?.(this.locked);
  };

  private look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.25, 1.25);
  }

  private bindInput(): void {
    const canvas = this.renderer.domElement;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onLockChange);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  private unbindInput(): void {
    const canvas = this.renderer.domElement;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.releaseLock();
  }

  /* ------------------------------------------------------------ terreno */

  private heightAt(x: number, z: number): number {
    const d = Math.hypot(x, z);
    let h =
      Math.sin(x * 0.045) * 1.7 +
      Math.cos(z * 0.05) * 1.5 +
      Math.sin((x + z) * 0.11) * 0.5 +
      Math.cos(x * 0.13 - z * 0.07) * 0.35;
    let flat = smoothstep(this.flatRadius, this.flatRadius + 16, d);
    if (this.hasPath && z > 0) flat *= smoothstep(4, 10, Math.abs(x));
    h *= flat * (this.worldId === HUB_ID ? 0.4 : 1);
    if (this.worldId === TORITOS_ID) h = toritosHeight(x, z, h);
    if (this.worldId !== TORITOS_ID) {
      h += smoothstep(this.bound - 25, this.bound + 20, d) * (this.worldId === HUB_ID ? 4 : 16);
    }
    return h;
  }

  private pathFactor(x: number, z: number): number {
    if (!this.hasPath || z < this.flatRadius - 6) return 0;
    return 1 - smoothstep(1.6, 3.2, Math.abs(x + Math.sin(z * 0.08) * 0.6));
  }

  /* ------------------------------------------------------------ construcción */

  private clearWorld(): void {
    if (!this.world) return;
    this.scene.remove(this.world);
    this.world.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const list = Array.isArray(material) ? material : material ? [material] : [];
      for (const m of list) {
        const map = (m as THREE.MeshBasicMaterial).map;
        if (map) map.dispose();
        m.dispose();
      }
    });
    this.world = null;
    this.sky = null;
    this.updaters = [];
    this.colliders = [];
    this.doors = [];
    this.treeSpot = null;
    this.lampPoints = [];
  }

  private buildWorld(worldId: string, report?: (value: number) => void): void {
    this.clearWorld();
    this.worldId = worldId;
    const theme = themeFor(worldId);
    const hub = worldId === HUB_ID;
    this.bound = hub ? 110 : 72;
    this.flatRadius = hub ? 24 : 15;
    this.hasPath = false;
    const rng = mulberry32(hashString(worldId));
    const low = this.options.low;
    const world = new THREE.Group();
    this.world = world;
    this.scene.add(world);

    this.scene.fog = new THREE.FogExp2(theme.fogColor ?? theme.sky.horizon, theme.fog);
    this.scene.background = new THREE.Color(theme.sky.horizon);
    // Reflejos suaves para los cuarzos del bosque.
    const toritos = worldId === TORITOS_ID;
    const tAssets = toritos ? toritosAssets() : null;
    // De día el resplandor lava la escena: en la tarde de los toritos casi no se usa.
    this.bloom.strength = toritos ? 0.12 : 0.65;
    this.renderer.toneMappingExposure = toritos ? 0.92 : 1.1;
    this.scene.environment = hub || toritos ? this.envMap : null;
    this.scene.environmentIntensity = toritos ? 0.35 : 0.12;

    const sunDir = hub
      ? new THREE.Vector3(-0.45, 0.42, -1)
      : toritos
        ? tAssets
          ? TORITOS_SUN_DIR.clone()
          : new THREE.Vector3(-1, 0.26, -0.35)
        : theme.night
          ? new THREE.Vector3(-0.4, 0.35, -1)
          : new THREE.Vector3(0.3, 0.22, -1);
    this.scene.backgroundRotation.set(0, 0, 0);
    this.scene.environmentRotation.set(0, 0, 0);
    if (tAssets) {
      // Cielo y paisaje reales (HDRI): fondo nítido y luz de la tarde.
      this.scene.background = tAssets.sky;
      this.scene.backgroundRotation.set(0, TORITOS_SKY_ROTATION, 0);
      this.scene.environment = this.toritosEnv ?? this.makeToritosEnv(tAssets.hdr);
      this.scene.environmentRotation.set(0, TORITOS_SKY_ROTATION, 0);
      this.scene.environmentIntensity = 0.9;
      this.scene.fog = new THREE.FogExp2('#d9b98c', 0.0032);
    } else {
      this.buildSky(world, theme, sunDir);
    }
    this.buildLights(world, theme, sunDir);
    report?.(0.35);
    if (hub) {
      this.buildHubGrove(world, theme, rng);
      this.buildGrass(world, theme, rng, low);
      report?.(0.7);
    } else {
      if (!(toritos && toritosHasModels())) this.buildGround(world, theme, rng, low);
      report?.(0.5);
      this.buildGrass(world, theme, rng, low);
      report?.(0.6);
      if (!toritos) {
        this.buildTrees(world, theme, rng, low);
        this.buildCrystals(world, theme, rng, low);
      }
      report?.(0.7);
    }

    if (toritos) {
      this.treeSpot = buildToritos(
        {
          world,
          rng,
          low,
          heightAt: (x, z) => this.heightAt(x, z),
          addCollider: (x, z, r) => this.colliders.push({ x, z, r }),
          addUpdater: (update) => this.updaters.push(update),
        },
        this.options.toritosSign,
      );
    } else if (!hub) {
      const tree = this.buildCrystalTree(theme.crystals, 1.6, rng);
      world.add(tree);
      this.colliders.push({ x: 0, z: 0, r: 4 });
      this.treeSpot = new THREE.Vector3(0, 0, 0);
    }
    if (!hub) {
      this.addDoor(
        world,
        { kind: 'return' },
        this.options.returnLabel,
        this.options.returnHint,
        0,
        31,
        themeFor(HUB_ID),
      );
      if (theme.islands) this.buildIslands(world, theme, rng);
    }
    if (theme.night) this.buildStars(world, rng);
    // Solo pétalos: las orbes de luz flotantes se quitaron (no encajaban con el estilo).
    if (theme.particles.style === 'petals' || theme.particles.style === 'snow') {
      this.buildParticles(world, theme, rng, low);
    }
    report?.(0.85);
  }

  private buildSky(world: THREE.Group, theme: WorldTheme, sunDir: THREE.Vector3): void {
    const material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(theme.sky.top) },
        uHorizon: { value: new THREE.Color(theme.sky.horizon) },
        uBottom: { value: new THREE.Color(theme.sky.bottom) },
        uSun: { value: new THREE.Color(theme.sky.sun) },
        uSunDir: { value: sunDir.clone().normalize() },
      },
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), material);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    world.add(sky);
    this.sky = sky;
  }

  private buildLights(world: THREE.Group, theme: WorldTheme, sunDir: THREE.Vector3): void {
    const hub = this.worldId === HUB_ID;
    const toritos = this.worldId === TORITOS_ID;
    // En el bosque la luz de relleno es menor para que se marquen las sombras largas.
    world.add(
      new THREE.HemisphereLight(
        theme.light.hemiSky,
        theme.light.hemiGround,
        hub ? 0.16 : toritos ? 0.6 : 1.7,
      ),
    );
    const sun = new THREE.DirectionalLight(theme.light.sun, theme.light.sunIntensity);
    sun.position
      .copy(sunDir)
      .multiplyScalar(100)
      .setY(Math.max(sunDir.y * 100, 40));
    world.add(sun);
    if (!hub && !toritos) return;

    // Luna (bosque) o sol de la tarde (toritos) bajos: sombras largas.
    const dir = (hub ? new THREE.Vector3(-0.45, 0.42, -1) : sunDir.clone()).normalize();
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.options.low ? 1024 : 2048, this.options.low ? 1024 : 2048);
    const cam = sun.shadow.camera;
    cam.left = -42;
    cam.right = 42;
    cam.top = 42;
    cam.bottom = -42;
    cam.near = 1;
    cam.far = 260;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.06;
    world.add(sun.target);
    this.updaters.push(() => {
      // La caja de sombras sigue al jugador (alineada a texeles para que no tiemble).
      const step = 84 / sun.shadow.mapSize.x;
      const cx = Math.round(this.position.x / step) * step;
      const cz = Math.round(this.position.z / step) * step;
      sun.target.position.set(cx, 0, cz);
      sun.position.set(cx + dir.x * 120, dir.y * 120, cz + dir.z * 120);
    });
  }

  private buildGround(
    world: THREE.Group,
    theme: WorldTheme,
    rng: () => number,
    low: boolean,
  ): void {
    const size = this.bound * 2 + 120;
    const segments = low ? 110 : 170;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(theme.ground);
    const dirt = new THREE.Color(theme.ground).lerp(new THREE.Color('#c9a27a'), 0.45);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.heightAt(x, z));
      const noise = (Math.sin(x * 0.3) * Math.cos(z * 0.27) + rng() * 0.6) * 0.06;
      tmp.copy(base).offsetHSL(0, 0, noise);
      const path = this.pathFactor(x, z);
      if (path > 0) tmp.lerp(dirt, path * 0.85);
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }),
    );
    world.add(ground);
  }

  private buildGrass(world: THREE.Group, theme: WorldTheme, rng: () => number, low: boolean): void {
    const count = Math.round(
      (this.worldId === HUB_ID ? 52000 : this.worldId === TORITOS_ID ? 26000 : 16000) *
        (low ? 0.35 : 1),
    );
    const blade = new THREE.PlaneGeometry(0.075, 1, 1, 6);
    blade.translate(0, 0.5, 0);
    const bp = blade.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - bp.getY(i) ** 1.4 * 0.95));
    const hub = this.worldId === HUB_ID;
    const lamps = Array.from({ length: 12 }, (_, i) => {
      const p = this.lampPoints[i];
      return p ? new THREE.Vector4(p.x, p.y, p.z, 1) : new THREE.Vector4(0, -999, 0, 0);
    });
    const tips = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const material = new THREE.ShaderMaterial({
      vertexShader: GRASS_VERTEX,
      fragmentShader: GRASS_FRAGMENT,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uBase: { value: new THREE.Color(theme.grass.base) },
          // De noche casi sin luz propia: la ponen los faroles.
          uAmbient: {
            value: hub ? new THREE.Color(0.32, 0.36, 0.48) : new THREE.Color(0.62, 0.62, 0.6),
          },
          uSun: {
            value: hub
              ? new THREE.Color(0.1, 0.12, 0.18)
              : new THREE.Color(theme.light.sun).multiplyScalar(0.5),
          },
          uLampColor: { value: new THREE.Color('#ffae4a').multiplyScalar(2.6) },
          uLamps: { value: lamps },
          uLampCount: { value: Math.min(this.lampPoints.length, 12) },
        },
      ]),
    });
    const mesh = new THREE.InstancedMesh(blade, material, count);
    mesh.frustumCulled = false;
    const radius = this.worldId === HUB_ID ? FENCE_RADIUS + 1 : Math.min(this.bound, 80);
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 3; tries++) {
      const r = Math.sqrt(rng()) * radius;
      const a = rng() * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (this.pathFactor(x, z) > 0.3) continue;
      if (this.worldId === HUB_ID && Math.hypot(x, z) < 2.6) continue;
      if (this.worldId === TORITOS_ID && !toritosOpenGround(x, z)) continue;
      p.set(x, this.heightAt(x, z) - 0.05, z);
      e.set((rng() - 0.5) * 0.3, rng() * Math.PI, (rng() - 0.5) * 0.3);
      const h = this.worldId === HUB_ID ? 0.25 + rng() * 0.45 : 0.45 + rng() * 0.75;
      s.set(0.7 + rng() * 0.6, h, 1);
      setInstance(mesh, placed, p, e, s);
      c.set(pick(theme.grass.tips, rng)).offsetHSL(0, 0, (rng() - 0.5) * 0.08);
      tips.set([c.r, c.g, c.b], placed * 3);
      phases[placed] = rng() * Math.PI * 2;
      placed++;
    }
    mesh.count = placed;
    blade.setAttribute('aTip', new THREE.InstancedBufferAttribute(tips, 3));
    blade.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    world.add(mesh);
    this.updaters.push((time) => {
      material.uniforms.uTime!.value = time;
    });
  }

  private buildTrees(world: THREE.Group, theme: WorldTheme, rng: () => number, low: boolean): void {
    const style = theme.trees.style;
    const count = Math.round(theme.trees.count * (low ? 0.6 : 1));
    const parts =
      style === 'forest' || style === 'pine'
        ? 3
        : style === 'blossom'
          ? 5
          : style === 'crystal'
            ? 7
            : 2;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 1, 7);
    trunkGeo.translate(0, 0.5, 0);
    const canopyGeo = canopyGeometry(style);
    const trunks = new THREE.InstancedMesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({
        color: theme.trees.trunk,
        roughness: 0.9,
        flatShading: true,
      }),
      count,
    );
    const canopyMaterial =
      style === 'crystal'
        ? glowMaterial(0.55)
        : new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMaterial, count * parts);
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    const inner = this.worldId === HUB_ID ? 27 : 19;
    let placed = 0;
    let canopyIndex = 0;
    for (let tries = 0; placed < count && tries < count * 20; tries++) {
      const r = inner + rng() * (this.bound - inner + 10);
      const a = rng() * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (this.worldId === HUB_ID && z > 0 && Math.abs(x) < 7) continue;
      if (this.worldId !== HUB_ID && Math.abs(x) < 5 && z > 20 && z < 40) continue;
      if (this.colliders.some((col) => Math.hypot(col.x - x, col.z - z) < 3.4)) continue;
      const y = this.heightAt(x, z);
      const scale = 0.8 + rng() * 0.9;
      const trunkHeight = (style === 'pine' ? 2.2 : style === 'forest' ? 4.2 : 2.8) * scale;
      p.set(x, y - 0.2, z);
      e.set((rng() - 0.5) * 0.08, rng() * Math.PI, (rng() - 0.5) * 0.08);
      s.set(scale, trunkHeight, scale);
      setInstance(trunks, placed, p, e, s);
      this.colliders.push({ x, z, r: 0.45 * scale });
      for (let i = 0; i < parts; i++) {
        c.set(pick(theme.trees.canopy, rng)).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
        const ox = style === 'blossom' || style === 'crystal' ? (rng() - 0.5) * 2.6 * scale : 0;
        const oz = style === 'blossom' || style === 'crystal' ? (rng() - 0.5) * 2.6 * scale : 0;
        let cy: number;
        let cs: number;
        if (style === 'pine') {
          cy = trunkHeight * 0.6 + i * 1.5 * scale;
          cs = (2.4 - i * 0.6) * scale;
          s.set(cs, 2.4 * scale, cs);
        } else if (style === 'forest') {
          cy = trunkHeight + i * 1.4 * scale - 0.4;
          cs = (3.2 - i * 0.7) * scale;
          s.set(cs, cs * 0.85, cs);
        } else if (style === 'crystal') {
          cy = trunkHeight + rng() * 2.2 * scale;
          cs = (0.5 + rng() * 0.5) * scale;
          s.set(cs * 0.45, cs * 1.4, cs * 0.45);
        } else if (style === 'blossom') {
          cy = trunkHeight + 0.6 + rng() * 1.4 * scale;
          cs = (1.2 + rng() * 0.8) * scale;
          s.set(cs, cs * 0.8, cs);
        } else {
          cy = trunkHeight + i * 1.0 * scale + 0.4;
          cs = (2.4 - i * 0.8) * scale;
          s.set(cs, cs * 0.9, cs);
        }
        p.set(x + ox, y + cy, z + oz);
        e.set(
          style === 'crystal' ? (rng() - 0.5) * 0.9 : 0,
          rng() * Math.PI,
          style === 'crystal' ? (rng() - 0.5) * 0.9 : 0,
        );
        setInstance(canopies, canopyIndex++, p, e, s, c);
      }
      placed++;
    }
    trunks.count = placed;
    canopies.count = canopyIndex;
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
    world.add(trunks, canopies);
  }

  private buildCrystals(
    world: THREE.Group,
    theme: WorldTheme,
    rng: () => number,
    low: boolean,
  ): void {
    const clusters = Math.round((this.worldId === HUB_ID ? 70 : 90) * (low ? 0.6 : 1));
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const mesh = new THREE.InstancedMesh(geometry, glowMaterial(0.45), clusters * 4);
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    let index = 0;
    for (let i = 0; i < clusters; i++) {
      const r = 6 + rng() * (this.bound - 10);
      const a = rng() * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (this.pathFactor(x, z) > 0.1) continue;
      if (this.worldId === HUB_ID && Math.abs(Math.hypot(x, z) - DOOR_RING) < 3) continue;
      const y = this.heightAt(x, z);
      const color = pick(theme.crystals, rng);
      const n = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) {
        const h = (0.35 + rng() * 0.8) * (j === 0 ? 1.4 : 1);
        p.set(x + (rng() - 0.5) * 0.7, y + h * 0.4, z + (rng() - 0.5) * 0.7);
        e.set((rng() - 0.5) * 0.9, rng() * Math.PI, (rng() - 0.5) * 0.9);
        s.set(h * 0.28, h, h * 0.28);
        c.set(color).offsetHSL(0, 0, (rng() - 0.5) * 0.1);
        setInstance(mesh, index++, p, e, s, c);
      }
    }
    mesh.count = index;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }

  /** Árbol de cuarzo: ramas de alambre cobrizo trenzado con cristales en las puntas (como los del taller). */
  private buildCrystalTree(
    colors: string[],
    scale: number,
    rng: () => number,
    crystalGlow = 1.5,
  ): THREE.Group {
    const group = new THREE.Group();
    const tubes: THREE.BufferGeometry[] = [];
    const tips: THREE.Vector3[] = [];
    const branch = (
      start: THREE.Vector3,
      dir: THREE.Vector3,
      length: number,
      radius: number,
      depth: number,
    ) => {
      const end = start.clone().addScaledVector(dir, length);
      const mid = start
        .clone()
        .lerp(end, 0.5)
        .add(new THREE.Vector3((rng() - 0.5) * length * 0.3, 0, (rng() - 0.5) * length * 0.3));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      tubes.push(new THREE.TubeGeometry(curve, 6, radius, 5, false));
      if (depth === 0) {
        tips.push(end);
        return;
      }
      const children = depth >= 3 ? 3 : 2 + (rng() < 0.6 ? 1 : 0);
      for (let i = 0; i < children; i++) {
        const angle = (i / children) * Math.PI * 2 + rng() * 1.2;
        const spread = 0.55 + rng() * 0.35;
        const next = new THREE.Vector3(
          dir.x + Math.cos(angle) * spread,
          dir.y + 0.35 + rng() * 0.3,
          dir.z + Math.sin(angle) * spread,
        ).normalize();
        branch(end, next, length * (0.7 + rng() * 0.1), radius * 0.66, depth - 1);
      }
    };
    // Tronco: varias hebras trenzadas.
    const strands = 6;
    for (let i = 0; i < strands; i++) {
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const a = (i / strands) * Math.PI * 2 + t * 2.4;
        const r = 0.32 * (1 - t * 0.55) + (k === 0 ? 0.35 : 0);
        points.push(new THREE.Vector3(Math.cos(a) * r, t * 2.6, Math.sin(a) * r));
      }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.075, 5, false));
    }
    branch(new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(0, 1, 0), 1.5, 0.12, 4);
    const wire = new THREE.Mesh(
      mergeGeometries(tubes),
      new THREE.MeshStandardMaterial({
        color: '#c99466',
        metalness: 0.35,
        roughness: 0.4,
        emissive: '#5a321c',
        emissiveIntensity: 0.35,
      }),
    );
    for (const tube of tubes) tube.dispose();
    group.add(wire);

    const crystals = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(1, 0),
      glowMaterial(crystalGlow),
      tips.length * 5,
    );
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    let index = 0;
    for (const tip of tips) {
      for (let j = 0; j < 5; j++) {
        const size = 0.16 + rng() * 0.16;
        p.copy(tip).add(
          new THREE.Vector3((rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3),
        );
        e.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
        s.set(size, size * 1.5, size);
        c.set(pick(colors, rng));
        setInstance(crystals, index++, p, e, s, c);
      }
    }
    crystals.computeBoundingSphere();
    group.add(crystals);

    // Base de piedra (geoda) como en las piezas reales.
    const base = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: '#3a3346', roughness: 0.6, flatShading: true }),
    );
    base.scale.set(1.5, 0.45, 1.3);
    base.position.y = 0.05;
    group.add(base);
    const geode = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(1, 0),
      glowMaterial(0.6),
      26,
    );
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2;
      const r = 0.4 + rng() * 0.95;
      const size = 0.12 + rng() * 0.12;
      p.set(Math.cos(a) * r, 0.38 - r * 0.14, Math.sin(a) * r * 0.85);
      e.set((rng() - 0.5) * 0.8, rng() * Math.PI, (rng() - 0.5) * 0.8);
      s.set(size, size * 1.8, size);
      c.set(pick(colors, rng));
      setInstance(geode, i, p, e, s, c);
    }
    geode.computeBoundingSphere();
    group.add(geode);

    const glow = new THREE.PointLight(colors[0] ?? '#ffffff', 18, 22, 1.6);
    glow.position.set(0, 5.5, 0);
    group.add(glow);

    group.scale.setScalar(scale * 1.6);
    group.position.y = this.heightAt(0, 0) - 0.1;
    this.updaters.push((time) => {
      crystals.rotation.y = Math.sin(time * 0.2) * 0.02;
      glow.intensity = 16 + Math.sin(time * 1.3) * 3;
    });
    return group;
  }

  /** Bosque de entrada en estilo stop-motion (ver `grove.ts`). */
  private buildHubGrove(world: THREE.Group, theme: WorldTheme, rng: () => number): void {
    const handles = buildGrove(
      {
        world,
        rng,
        low: this.options.low,
        heightAt: (x, z) => this.heightAt(x, z),
        addCollider: (x, z, r) => this.colliders.push({ x, z, r }),
        addUpdater: (update) => this.updaters.push(update),
        addLamp: (point) => this.lampPoints.push(point),
      },
      theme,
      this.options.doors,
    );
    for (const handle of handles) {
      handle.group.updateMatrixWorld(true);
      this.doors.push({
        target: { kind: 'door', id: handle.id },
        inverse: handle.group.matrixWorld.clone().invert(),
        reach: 3.5,
        glow: 0,
        setGlow: handle.setGlow,
        open: handle.open,
      });
    }
  }

  private addDoor(
    world: THREE.Group,
    target: NearTarget,
    label: string,
    caption: string,
    x: number,
    z: number,
    theme: WorldTheme,
    rotation = Math.PI,
  ): void {
    const group = new THREE.Group();
    group.position.set(x, this.heightAt(x, z), z);
    group.rotation.y = rotation;

    const outer = archShape(3.1, 4.7);
    outer.holes.push(archShape(2.2, 4.25));
    const frameGeo = new THREE.ExtrudeGeometry(outer, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 24,
    });
    frameGeo.translate(0, 0, -0.19);
    const frame = new THREE.Mesh(
      frameGeo,
      new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.55, metalness: 0.05 }),
    );
    group.add(frame);

    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.3, 0.25, 7),
      new THREE.MeshStandardMaterial({ color: '#d8ccb8', roughness: 0.8, flatShading: true }),
    );
    step.scale.set(1, 1, 0.55);
    step.position.y = -0.05;
    group.add(step);

    const rombo = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        color: '#b8643f',
        emissive: '#b8643f',
        emissiveIntensity: 1.6,
        roughness: 0.3,
      }),
    );
    rombo.scale.set(0.2, 0.28, 0.1);
    rombo.position.set(0, 5.0, 0);
    group.add(rombo);

    const inner = archShape(2.2, 4.25);
    const portal = new THREE.ShaderMaterial({
      vertexShader: PORTAL_VERTEX,
      fragmentShader: PORTAL_FRAGMENT,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: new THREE.Vector2(2.2, 4.25) },
        uA: { value: new THREE.Color(theme.sky.top) },
        uB: { value: new THREE.Color(theme.crystals[0] ?? theme.sky.horizon) },
        uC: { value: new THREE.Color(theme.sky.horizon) },
        uBoost: { value: 0 },
      },
    });
    const portalMesh = new THREE.Mesh(new THREE.ShapeGeometry(inner, 24), portal);
    group.add(portalMesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 2.2, 40),
      new THREE.MeshBasicMaterial({
        color: theme.crystals[0] ?? theme.sky.horizon,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1, 0.55, 1);
    ring.position.set(0, 0.12, 1.4);
    group.add(ring);

    const light = new THREE.PointLight(theme.crystals[0] ?? '#ffffff', 7, 10, 1.8);
    light.position.set(0, 2.2, 1.4);
    group.add(light);

    const sign = labelMesh(label, caption);
    sign.position.set(0, 6.1, 0.05);
    group.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.05;
    group.add(back);

    world.add(group);
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    const seed = rng01(x + z);
    this.updaters.push((time) => {
      portal.uniforms.uTime!.value = time + seed * 10;
      rombo.rotation.y = time * 0.8;
      rombo.position.y = 5.0 + Math.sin(time * 1.4 + seed * 6) * 0.06;
    });
    // Postes del marco: solo se cruza por el centro.
    for (const side of [-1, 1]) {
      const post = new THREE.Vector3(side * 1.35, 0, 0).applyMatrix4(group.matrixWorld);
      this.colliders.push({ x: post.x, z: post.z, r: 0.42 });
    }
    this.doors.push({
      target,
      inverse,
      reach: null,
      glow: 0,
      setGlow: (value) => {
        portal.uniforms.uBoost!.value = value * 0.45;
      },
    });
  }

  private buildIslands(world: THREE.Group, theme: WorldTheme, rng: () => number): void {
    for (let i = 0; i < 7; i++) {
      const island = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(3 + rng() * 2, 5 + rng() * 3, 7),
        new THREE.MeshStandardMaterial({ color: '#3b3560', roughness: 0.9, flatShading: true }),
      );
      rock.rotation.x = Math.PI;
      island.add(rock);
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4, 3.2, 0.6, 7),
        new THREE.MeshStandardMaterial({
          color: theme.grass.tips[i % theme.grass.tips.length],
          roughness: 0.8,
          flatShading: true,
        }),
      );
      top.position.y = 2.6;
      island.add(top);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({
          color: theme.crystals[i % theme.crystals.length],
          emissive: theme.crystals[i % theme.crystals.length],
          emissiveIntensity: 1.2,
          flatShading: true,
        }),
      );
      crystal.scale.set(0.6, 1.6, 0.6);
      crystal.position.y = 4.4;
      island.add(crystal);
      const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
      const r = 28 + rng() * 22;
      const baseY = 14 + rng() * 14;
      island.position.set(Math.sin(a) * r, baseY, Math.cos(a) * r);
      world.add(island);
      const phase = rng() * 6;
      this.updaters.push((time) => {
        island.position.y = baseY + Math.sin(time * 0.4 + phase) * 0.8;
        crystal.rotation.y = time * 0.6;
      });
    }
  }

  private buildStars(world: THREE.Group, rng: () => number): void {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rng() * Math.PI * 2;
      const v = 0.08 + rng() * 0.9;
      const r = 500;
      positions.set(
        [Math.cos(u) * Math.sqrt(1 - v * v) * r, v * r, Math.sin(u) * Math.sqrt(1 - v * v) * r],
        i * 3,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 1.6,
        sizeAttenuation: false,
        fog: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    stars.frustumCulled = false;
    world.add(stars);
    // Luna grande con mares y cráteres, en la misma dirección que la luz que proyecta las sombras.
    const moonDir = new THREE.Vector3(-0.45, 0.42, -1).normalize();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(24, 48, 32),
      new THREE.MeshBasicMaterial({
        map: moonTexture(),
        color: new THREE.Color('#fff8ec').multiplyScalar(1.05),
        fog: false,
      }),
    );
    moon.rotation.y = -0.6;
    world.add(moon);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: '#b9c8ff',
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.scale.setScalar(190);
    world.add(halo);
    this.updaters.push(() => {
      stars.position.copy(this.camera.position);
      moon.position.copy(this.camera.position).addScaledVector(moonDir, 430);
      halo.position.copy(this.camera.position).addScaledVector(moonDir, 440);
    });
  }

  private buildParticles(
    world: THREE.Group,
    theme: WorldTheme,
    rng: () => number,
    low: boolean,
  ): void {
    const count = Math.round(theme.particles.count * (low ? 0.5 : 1));
    const height = theme.particles.style === 'fireflies' ? 6 : 18;
    const radius = this.worldId === HUB_ID ? FENCE_RADIUS + 8 : 45;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(rng()) * radius;
      const a = rng() * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const y =
        theme.particles.style === 'fireflies'
          ? this.heightAt(x, z) + 0.5 + rng() * height
          : rng() * height;
      positions.set([x, y, z], i * 3);
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const styleIndex = { fireflies: 0, petals: 1, stars: 2, sparkles: 2, snow: 3 }[
      theme.particles.style
    ];
    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending:
        theme.particles.style === 'petals' || theme.particles.style === 'snow'
          ? THREE.NormalBlending
          : THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: {
          value:
            theme.particles.style === 'petals' ? 9 : theme.particles.style === 'snow' ? 2.2 : 6,
        },
        uStyle: { value: styleIndex },
        uHeight: { value: height },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uColor: { value: new THREE.Color(theme.particles.color) },
      },
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    world.add(points);
    this.updaters.push((time) => {
      material.uniforms.uTime!.value = time;
    });
  }
}

/* ------------------------------------------------------------------ piezas sueltas */

function rng01(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function canopyGeometry(style: TreeStyle): THREE.BufferGeometry {
  switch (style) {
    case 'pine':
      return new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0);
    case 'crystal':
      return new THREE.OctahedronGeometry(1, 0);
    case 'blossom':
      return new THREE.IcosahedronGeometry(1, 1);
    default:
      return new THREE.IcosahedronGeometry(1, 1);
  }
}

/** Letrero sobre la puerta: nombre (Fraunces) y piedras (DM Sans), color hueso. */
function labelMesh(title: string, caption: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(10, 16, 30, 0.55)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#f8f4ee';
    ctx.font = '600 120px Fraunces, Georgia, serif';
    ctx.fillText(title, 512, 140);
    ctx.font = '500 40px "DM Sans", system-ui, sans-serif';
    ctx.fillStyle = '#f1eadf';
    const spaced = caption.toUpperCase().split('').join(' ');
    ctx.fillText(spaced, 512, 230);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2 * (300 / 1024)), material);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Textura de luna: disco claro con mares oscuros y cráteres suaves (generada, sin fotos). */
function moonTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e9e4d8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const rng = mulberry32(7);
  // Mares: manchas grandes y difusas.
  for (let i = 0; i < 14; i++) {
    const x = rng() * canvas.width;
    const y = size * (0.25 + rng() * 0.5);
    const r = 40 + rng() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(120, 118, 128, 0.55)');
    g.addColorStop(1, 'rgba(120, 118, 128, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Cráteres: anillo claro y centro algo más oscuro.
  for (let i = 0; i < 160; i++) {
    const x = rng() * canvas.width;
    const y = rng() * size;
    const r = 3 + rng() ** 3 * 26;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150, 146, 150, 0.35)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.strokeStyle = 'rgba(255, 252, 244, 0.45)';
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Halo suave alrededor de la luna. */
function haloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
