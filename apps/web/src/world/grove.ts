import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { carvedMaterial } from './carved';
import { quartzCluster } from './quartz';
import { themeFor, type WorldTheme } from './worlds';

/**
 * El Bosque de las Intenciones en estilo stop-motion: troncos enormes tallados, suelo con vetas en
 * espiral, siluetas de árboles finos en la bruma ámbar, velas, hongos y helechos de arcilla. Cada
 * intención tiene una puerta tallada en su tronco con un símbolo propio de Antrina (cristal, pétalo,
 * arco ojival, sol, cerradura y rombo).
 */

export const GROVE_RING = 16.5;

/** Radio de la cerca de madera que encierra el claro: el jugador no pasa de aquí. */
export const FENCE_RADIUS = 25;

/** Copas en lo alto: desactivadas, en la bruma parecían globos. */
const SHOW_CANOPY = false;

export interface GroveDoor {
  id: string;
  label: string;
  stones: string;
}

export interface GroveDoorHandle {
  id: string;
  group: THREE.Group;
  setGlow(value: number): void;
  open(): void;
}

export interface GroveContext {
  world: THREE.Group;
  rng: () => number;
  low: boolean;
  heightAt(x: number, z: number): number;
  addCollider(x: number, z: number, r: number): void;
  addUpdater(update: (time: number, dt: number) => void): void;
  /** Posición de cada farol (ilumina el pasto). */
  addLamp?(point: THREE.Vector3): void;
}

export function doorAngle(index: number, total: number): number {
  const start = THREE.MathUtils.degToRad(48);
  const end = THREE.MathUtils.degToRad(312);
  return total <= 1 ? Math.PI : start + ((end - start) * index) / (total - 1);
}

/* ------------------------------------------------------------------ geometrías */

/** Perfil de tronco con raíces abiertas, como los árboles del taller pero gigantes. */
function trunkGeometry(bend: number, seed: number): THREE.BufferGeometry {
  const profile = [
    [3.1, 0],
    [2.2, 0.35],
    [1.75, 1.0],
    [1.5, 2.2],
    [1.38, 5],
    [1.3, 12],
    [1.18, 24],
    [1.05, 38],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  const geometry = new THREE.LatheGeometry(profile, 44);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // Raíces: lóbulos en la base.
    const roots = y < 1.6 ? (1 - y / 1.6) ** 2 * Math.max(0, Math.sin(a * 5 + seed)) * 0.9 : 0;
    const r = Math.hypot(x, z);
    const scale = r > 0 ? (r + roots) / r : 1;
    // Curva suave del tronco, algo torcido como en una maqueta.
    const offset = Math.sin(y * 0.06 + seed) * bend * (y / 38) * 6;
    pos.setXYZ(i, x * scale + offset, y, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Tronco de una puerta: más ancho, sin raíces al frente y con una cara plana tallada (z = `front`)
 * donde se apoya la puerta.
 */
function doorTrunkGeometry(seed: number, front: number): THREE.BufferGeometry {
  const profile = [
    [3.0, 0],
    [2.55, 0.3],
    [2.35, 1.0],
    [2.25, 2.6],
    [2.15, 4.2],
    [2.0, 9],
    [1.8, 20],
    [1.55, 38],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  const geometry = new THREE.LatheGeometry(profile, 64);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // Lado frontal (+z): sin raíces.
    const frontness = Math.max(0, Math.sin(a));
    const roots =
      y < 1.6
        ? (1 - y / 1.6) ** 2 * Math.max(0, Math.sin(a * 5 + seed)) * 1.1 * (1 - frontness)
        : 0;
    const r = Math.hypot(x, z);
    const scale = r > 0 ? (r + roots) / r : 1;
    x *= scale;
    z *= scale;
    // Cara plana donde va la puerta, que se funde con la corteza hacia arriba.
    if (y < 4.2 && z > front && Math.abs(x) < 1.7) {
      const blend = THREE.MathUtils.smoothstep(y, 3.4, 4.2);
      z = THREE.MathUtils.lerp(front, z, blend);
    }
    pos.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function curlGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    if (t < 0.45) {
      const k = t / 0.45;
      points.push(new THREE.Vector3(Math.sin(k * 1.2) * 0.15, k * 1.1, 0));
    } else {
      const k = (t - 0.45) / 0.55;
      const angle = k * Math.PI * 3.2;
      const radius = 0.32 * (1 - k * 0.85);
      points.push(
        new THREE.Vector3(
          0.15 + Math.sin(angle) * radius,
          1.1 + 0.32 - Math.cos(angle) * radius,
          0,
        ),
      );
    }
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.045, 6, false);
}

/** Color de cada puerta (pintura sobre madera tallada). */
const DOOR_COLORS: Record<string, string> = {
  amor: '#b8434e',
  navidad: '#3f7a4c',
  halloween: '#d8732c',
  abundancia: '#d4a03c',
  cuarzos: '#a99ad6',
  toritos: '#b0583a',
  felicidad: '#e0913a',
  suerte: '#9c6a2c',
  proteccion: '#3f6f9e',
  mixto: '#3f8a84',
};

/** Silueta de una puerta (origen abajo al centro, ~2 × 2.9). La forma es lo que le da sentido. */
function doorShape(id: string): THREE.Shape {
  const s = new THREE.Shape();
  switch (id) {
    case 'amor': // corazón
      s.moveTo(0, 0.05);
      s.bezierCurveTo(-0.35, 0.5, -1.05, 1.25, -1.05, 2.05);
      s.bezierCurveTo(-1.05, 2.75, -0.42, 3.02, 0, 2.5);
      s.bezierCurveTo(0.42, 3.02, 1.05, 2.75, 1.05, 2.05);
      s.bezierCurveTo(1.05, 1.25, 0.35, 0.5, 0, 0.05);
      break;
    case 'navidad': // árbol de Navidad
      s.moveTo(-0.22, 0);
      s.lineTo(0.22, 0);
      s.lineTo(0.22, 0.3);
      s.lineTo(1.0, 0.3);
      s.lineTo(0.55, 1.05);
      s.lineTo(0.86, 1.05);
      s.lineTo(0.42, 1.8);
      s.lineTo(0.66, 1.8);
      s.lineTo(0, 2.8);
      s.lineTo(-0.66, 1.8);
      s.lineTo(-0.42, 1.8);
      s.lineTo(-0.86, 1.05);
      s.lineTo(-0.55, 1.05);
      s.lineTo(-1.0, 0.3);
      s.lineTo(-0.22, 0.3);
      s.lineTo(-0.22, 0);
      break;
    case 'halloween': // calabaza
      s.moveTo(0, 0.05);
      s.bezierCurveTo(0.9, -0.05, 1.1, 0.7, 1.08, 1.25);
      s.bezierCurveTo(1.06, 1.95, 0.7, 2.45, 0.15, 2.38);
      s.lineTo(-0.15, 2.38);
      s.bezierCurveTo(-0.7, 2.45, -1.06, 1.95, -1.08, 1.25);
      s.bezierCurveTo(-1.1, 0.7, -0.9, -0.05, 0, 0.05);
      break;
    case 'cuarzos': // punta de cuarzo
      s.moveTo(-0.8, 0);
      s.lineTo(0.8, 0);
      s.lineTo(0.92, 1.85);
      s.lineTo(0, 2.95);
      s.lineTo(-0.92, 1.85);
      s.lineTo(-0.8, 0);
      break;
    case 'abundancia': // moneda
      s.absarc(0, 1.42, 1.02, 0, Math.PI * 2, false);
      break;
    case 'toritos': // cabeza de torito con cuernos
      s.moveTo(0, 0.08);
      s.bezierCurveTo(0.42, 0.06, 0.6, 0.45, 0.66, 1.0);
      s.bezierCurveTo(0.7, 1.45, 0.82, 1.7, 0.98, 1.95);
      s.bezierCurveTo(1.08, 2.2, 1.06, 2.6, 0.92, 2.9);
      s.bezierCurveTo(0.82, 2.55, 0.7, 2.3, 0.45, 2.18);
      s.quadraticCurveTo(0, 2.32, -0.45, 2.18);
      s.bezierCurveTo(-0.7, 2.3, -0.82, 2.55, -0.92, 2.9);
      s.bezierCurveTo(-1.06, 2.6, -1.08, 2.2, -0.98, 1.95);
      s.bezierCurveTo(-0.82, 1.7, -0.7, 1.45, -0.66, 1.0);
      s.bezierCurveTo(-0.6, 0.45, -0.42, 0.06, 0, 0.08);
      break;
    case 'proteccion': // ojo protector
      s.moveTo(-1.02, 1.45);
      s.quadraticCurveTo(0, 3.25, 1.02, 1.45);
      s.quadraticCurveTo(0, -0.35, -1.02, 1.45);
      break;
    case 'felicidad': // sol
      s.absarc(0, 1.45, 1.0, 0, Math.PI * 2, false);
      break;
    case 'suerte': // herradura
      s.moveTo(-1.0, 0);
      s.lineTo(-0.45, 0);
      s.lineTo(-0.45, 1.6);
      s.absarc(0, 1.6, 0.45, Math.PI, 0, true);
      s.lineTo(0.45, 0);
      s.lineTo(1.0, 0);
      s.lineTo(1.0, 1.6);
      s.absarc(0, 1.6, 1.0, 0, Math.PI, false);
      s.lineTo(-1.0, 0);
      break;
    default: // rombo de marca
      s.moveTo(0, 0);
      s.lineTo(0.98, 1.47);
      s.lineTo(0, 2.95);
      s.lineTo(-0.98, 1.47);
      s.lineTo(0, 0);
  }
  return s;
}

function scaledShapeGeometry(shape: THREE.Shape, scale: number): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(shape, 32);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  geometry.translate(-cx, -cy, 0);
  geometry.scale(scale, scale, 1);
  geometry.translate(cx, cy, 0);
  return geometry;
}

/* ------------------------------------------------------------------ texturas */

function silhouetteTexture(rng: () => number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  const branch = (
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    depth: number,
  ) => {
    const x2 = x + Math.sin(angle) * length;
    const y2 = y - Math.cos(angle) * length;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * length * 0.3, (y + y2) / 2, x2, y2);
    ctx.stroke();
    if (depth <= 0) return;
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      branch(
        x2,
        y2,
        angle + (rng() - 0.5) * 1.3,
        length * (0.55 + rng() * 0.2),
        width * 0.62,
        depth - 1,
      );
    }
  };
  const trees = 16;
  for (let i = 0; i < trees; i++) {
    const x = ((i + rng() * 0.8) / trees) * canvas.width;
    const trunk = 330 + rng() * 120;
    const width = 6 + rng() * 9;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, canvas.height);
    ctx.lineTo(x + (rng() - 0.5) * 20, canvas.height - trunk);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      branch(
        x,
        canvas.height - trunk * (0.55 + k * 0.17),
        (rng() - 0.5) * 1.6,
        60 + rng() * 60,
        width * 0.5,
        3,
      );
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function shaftTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const vertical = ctx.createLinearGradient(0, 0, 0, 256);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, 64, 256);
  ctx.globalCompositeOperation = 'destination-in';
  const horizontal = ctx.createLinearGradient(0, 0, 64, 0);
  horizontal.addColorStop(0, 'rgba(0,0,0,0)');
  horizontal.addColorStop(0.5, 'rgba(0,0,0,1)');
  horizontal.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, 64, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Corteza real (Poly Haven, CC0: ver `public/world/textures/CREDITS.txt`) combinada con los surcos
 * tallados del shader. Se precarga antes de construir el bosque.
 */
let barkMaps: { map: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture } | null = null;

/** Árbol central: "Island Tree 02" de Poly Haven (CC0), optimizado a GLB con meshopt. */
let centerTree: THREE.Object3D | null = null;

async function loadCenterTree(): Promise<void> {
  if (centerTree) return;
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('/world/models/island_tree.glb');
    centerTree = gltf.scene;
  } catch {
    centerTree = null; // sin modelo: el claro queda solo con los cuarzos
  }
}

let grassMaps: { map: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture } | null = null;

/** Árbol real del bosque (para reutilizarlo como molle en el pueblo). */
export function getCenterTreeTemplate(): THREE.Object3D | null {
  return centerTree;
}

/** Texturas de pasto real (Poly Haven "Leafy Grass"). */
export function getGrassMaps(): {
  map: THREE.Texture;
  normal: THREE.Texture;
  arm: THREE.Texture;
} | null {
  return grassMaps;
}

/** Árbol central y 6 texturas, todo a la vez. `onFile` recibe la fracción descargada (0–1). */
export async function preloadGroveTextures(onFile?: (fraction: number) => void): Promise<void> {
  const total = 7;
  let done = 0;
  const tick = <T>(value: T): T => {
    done += 1;
    onFile?.(done / total);
    return value;
  };
  const tree = loadCenterTree().then(tick, tick);
  if (barkMaps) {
    await tree;
    return;
  }
  const loader = new THREE.TextureLoader();
  const load = async (name: string, color: boolean, prefix = 'japanese_cedar_bark') => {
    const texture = tick(await loader.loadAsync(`/world/textures/${prefix}_${name}_1k.webp`));
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 8;
    return texture;
  };
  const set = (prefix?: string) =>
    Promise.all([
      load('diff', true, prefix),
      load('nor_gl', false, prefix),
      load('arm', false, prefix),
    ])
      .then(([map, normal, arm]) => ({ map, normal, arm }))
      // Sin texturas queda el tallado procedimental (corteza) o el color base (pasto).
      .catch(() => null);
  const [bark, grass] = await Promise.all([set(), set('leafy_grass'), tree]);
  barkMaps = bark;
  grassMaps = grass;
}

/** Corteza para un tronco: `around` metros de circunferencia, `tall` de alto. */
function barkMaterial(around: number, tall: number, tint: string): THREE.MeshStandardMaterial {
  const material = carvedMaterial({
    color: tint,
    pattern: 'bark',
    groove: barkMaps ? 0.62 : 0.42,
    depth: barkMaps ? 0.9 : 1.4,
    frequency: 26,
  });
  if (barkMaps) {
    // La textura cubre 1 m × 2 m.
    const repeat = (texture: THREE.Texture) => {
      const copy = texture.clone();
      copy.repeat.set(Math.round(around), tall / 2);
      copy.needsUpdate = true;
      return copy;
    };
    material.map = repeat(barkMaps.map);
    material.normalMap = repeat(barkMaps.normal);
    material.normalScale = new THREE.Vector2(2.2, 2.2);
    const arm = repeat(barkMaps.arm);
    material.roughnessMap = arm;
    material.aoMap = arm;
    material.aoMapIntensity = 1;
    material.roughness = 1;
  }
  return material;
}

/* ------------------------------------------------------------------ construcción */

export function buildGrove(
  ctx: GroveContext,
  theme: WorldTheme,
  doors: GroveDoor[],
): GroveDoorHandle[] {
  const { world, rng, low } = ctx;

  // 1) Troncos del bosque (tres variantes torcidas, instanciadas).
  const trunks: { x: number; z: number; s: number }[] = [];
  const doorSpots = doors.map((_, i) => {
    const a = doorAngle(i, doors.length);
    return { x: Math.sin(a) * GROVE_RING, z: Math.cos(a) * GROVE_RING, a };
  });
  const target = low ? 55 : 95;
  for (let tries = 0; trunks.length < target && tries < target * 30; tries++) {
    // Justo detrás de la cerca, cada vez más espaciados: el claro queda encerrado por el bosque.
    const r = FENCE_RADIUS + 3 + Math.pow(rng(), 1.6) * 80;
    const a = rng() * Math.PI * 2;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const s = 0.75 + rng() * 0.6;
    if (trunks.some((t) => Math.hypot(t.x - x, t.z - z) < 4.2 * Math.max(s, t.s))) continue;
    trunks.push({ x, z, s });
  }
  const variants = [0, 1, 2].map((v) => trunkGeometry((v - 1) * 0.35 + 0.05, v * 2.1));
  const bark = barkMaterial(9, 38, '#c9a688');
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  variants.forEach((geometry, v) => {
    const mine = trunks.filter((_, i) => i % 3 === v);
    const mesh = new THREE.InstancedMesh(geometry, bark, mine.length);
    mine.forEach((t, i) => {
      p.set(t.x, ctx.heightAt(t.x, t.z) - 0.15, t.z);
      q.setFromAxisAngle(up, rng() * Math.PI * 2);
      sc.set(t.s, 1 + rng() * 0.15, t.s);
      mesh.setMatrixAt(i, m.compose(p, q, sc));
      ctx.addCollider(t.x, t.z, 1.55 * t.s);
    });
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
  });

  // Copas de follaje de arcilla en lo alto (se ven al mirar arriba).
  const canopyColors = ['#3f5a4c', '#53465e', '#5b6b4a', '#46606a'];
  const canopy = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    carvedMaterial({ color: '#ffffff', pattern: 'clay', frequency: 1.4, groove: 0.6, depth: 2.5 }),
    trunks.length * 3,
  );
  const c = new THREE.Color();
  let ci = 0;
  for (const t of trunks) {
    for (let k = 0; k < 3; k++) {
      p.set(t.x + (rng() - 0.5) * 6, 30 + k * 3 + rng() * 4, t.z + (rng() - 0.5) * 6);
      q.setFromAxisAngle(up, rng() * 6);
      const r = (5 + rng() * 4) * t.s;
      sc.set(r, r * 0.7, r);
      canopy.setMatrixAt(ci, m.compose(p, q, sc));
      canopy.setColorAt(ci, c.set(canopyColors[(ci + k) % canopyColors.length]!));
      ci++;
    }
  }
  canopy.computeBoundingSphere();
  if (SHOW_CANOPY) world.add(canopy);

  // 2) Suelo de pasto con hojas (Poly Haven "Leafy Grass", CC0); encima van briznas 3D.
  const size = 320;
  const groundGeo = new THREE.PlaneGeometry(size, size, low ? 90 : 140, low ? 90 : 140);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) gp.setY(i, ctx.heightAt(gp.getX(i), gp.getZ(i)));
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ color: '#b8c4a8', roughness: 1 });
  if (grassMaps) {
    // La textura cubre ~2 m: se repite por todo el suelo.
    const repeat = (texture: THREE.Texture) => {
      const copy = texture.clone();
      copy.repeat.set(size / 2.2, size / 2.2);
      copy.needsUpdate = true;
      return copy;
    };
    groundMat.map = repeat(grassMaps.map);
    groundMat.normalMap = repeat(grassMaps.normal);
    groundMat.normalScale = new THREE.Vector2(1.4, 1.4);
    const arm = repeat(grassMaps.arm);
    groundMat.roughnessMap = arm;
    groundMat.aoMap = arm;
  } else {
    groundMat.color.set('#2f4a30');
  }
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  world.add(ground);

  // 3) Siluetas de árboles finos en la bruma (telones como en una maqueta).
  const silhouettes = silhouetteTexture(rng);
  // Cada capa más lejana se acerca al color de la bruma.
  const haze = new THREE.Color(theme.fogColor ?? theme.sky.horizon);
  const black = new THREE.Color('#05070d');
  const layers = [
    { radius: 62, color: haze.clone().lerp(black, 0.8), count: 14 },
    { radius: 88, color: haze.clone().lerp(black, 0.6), count: 16 },
    { radius: 115, color: haze.clone().lerp(black, 0.4), count: 18 },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const a = (i / layer.count) * Math.PI * 2 + rng() * 0.2;
      const width = ((Math.PI * 2 * layer.radius) / layer.count) * 1.25;
      const tex = silhouettes.clone();
      tex.needsUpdate = true;
      tex.offset.x = rng();
      tex.repeat.x = 0.6 + rng() * 0.3;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, 34),
        new THREE.MeshBasicMaterial({
          color: layer.color,
          alphaMap: tex,
          transparent: true,
          alphaTest: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      const x = Math.sin(a) * layer.radius;
      const z = Math.cos(a) * layer.radius;
      plane.position.set(x, ctx.heightAt(x, z) + 15, z);
      plane.lookAt(0, plane.position.y, 0);
      world.add(plane);
    }
  }

  // 4) Rayos de luz entre los troncos.
  const shaftTex = shaftTexture();
  const shaftMat = new THREE.MeshBasicMaterial({
    color: theme.sky.sun,
    map: shaftTex,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const shafts: THREE.Group[] = [];
  for (let i = 0; i < (low ? 5 : 9); i++) {
    const shaft = new THREE.Group();
    for (const rot of [0, Math.PI / 2]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.6 + rng() * 2.5, 70), shaftMat);
      plane.rotation.y = rot;
      shaft.add(plane);
    }
    const x = (rng() - 0.5) * 50;
    const z = -10 + (rng() - 0.5) * 60;
    shaft.position.set(x, 26, z);
    shaft.rotation.set(-0.55, 0, (rng() - 0.5) * 0.3);
    world.add(shaft);
    shafts.push(shaft);
  }
  ctx.addUpdater((time) => {
    shaftMat.opacity = 0.05 + Math.sin(time * 0.35) * 0.015;
  });

  // 5) Pocas velas: solo un par junto al árbol central.
  const candleSpots: THREE.Vector3[] = [
    new THREE.Vector3(-2.8, 0, 5.2),
    new THREE.Vector3(-2.4, 0, 5.6),
    new THREE.Vector3(3.1, 0, 4.9),
  ];
  const candleGeo = new THREE.CylinderGeometry(0.09, 0.1, 1, 10);
  candleGeo.translate(0, 0.5, 0);
  const candles = new THREE.InstancedMesh(
    candleGeo,
    carvedMaterial({ color: '#f1e3c8', pattern: 'clay', frequency: 2.5, groove: 0.93, depth: 0.4 }),
    candleSpots.length,
  );
  const flameGeo = new THREE.SphereGeometry(0.07, 8, 6);
  flameGeo.scale(1, 1.9, 1);
  const flameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffb54a').multiplyScalar(4),
  });
  const flames = new THREE.InstancedMesh(flameGeo, flameMat, candleSpots.length);
  candleSpots.forEach((spot, i) => {
    const h = 0.35 + rng() * 0.6;
    const y = ctx.heightAt(spot.x, spot.z);
    candles.setMatrixAt(i, m.compose(p.set(spot.x, y, spot.z), q.identity(), sc.set(1, h, 1)));
    flames.setMatrixAt(
      i,
      m.compose(p.set(spot.x, y + h + 0.12, spot.z), q.identity(), sc.set(1, 1, 1)),
    );
  });
  candles.computeBoundingSphere();
  flames.computeBoundingSphere();
  world.add(candles, flames);
  ctx.addUpdater((time) => {
    flames.scale.y = 1 + Math.sin(time * 9) * 0.04 + Math.sin(time * 13.7) * 0.03;
  });

  // 6) Hongos y helechos en espiral de arcilla.
  const mushroomCount = low ? 50 : 110;
  const stemGeo = new THREE.CylinderGeometry(0.06, 0.09, 1, 8);
  stemGeo.translate(0, 0.5, 0);
  const capGeo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const clayMat = carvedMaterial({
    color: '#ffffff',
    pattern: 'clay',
    frequency: 6,
    groove: 0.8,
    depth: 0.8,
  });
  const stems = new THREE.InstancedMesh(stemGeo, clayMat, mushroomCount);
  const caps = new THREE.InstancedMesh(capGeo, clayMat, mushroomCount);
  const capColors = ['#e9dcc4', '#c8643f', '#e7a3a8', '#9fb0c8', '#d9b45a'];
  const anchors = [
    ...trunks.map((t) => ({ x: t.x, z: t.z, r: 1.8 * t.s })),
    ...doorSpots.map((d) => ({ x: d.x, z: d.z, r: 2.9 })),
  ];
  for (let i = 0; i < mushroomCount; i++) {
    const anchor = anchors[Math.floor(rng() * anchors.length)]!;
    const a = rng() * Math.PI * 2;
    const r = anchor.r + 0.2 + rng() * 1.2;
    const x = anchor.x + Math.cos(a) * r;
    const z = anchor.z + Math.sin(a) * r;
    const y = ctx.heightAt(x, z);
    const h = 0.25 + rng() * 0.55;
    const lean = (rng() - 0.5) * 0.4;
    q.setFromEuler(new THREE.Euler(lean, rng() * 6, lean * 0.5));
    stems.setMatrixAt(i, m.compose(p.set(x, y, z), q, sc.set(1, h, 1)));
    const capR = 0.16 + rng() * 0.22;
    const top = new THREE.Vector3(0, h, 0).applyQuaternion(q);
    caps.setMatrixAt(
      i,
      m.compose(p.set(x + top.x, y + top.y - 0.02, z + top.z), q, sc.set(capR, capR * 0.6, capR)),
    );
    stems.setColorAt(i, c.set('#efe2c9'));
    caps.setColorAt(i, c.set(capColors[Math.floor(rng() * capColors.length)]!));
  }
  stems.computeBoundingSphere();
  caps.computeBoundingSphere();
  stems.castShadow = caps.castShadow = true;
  world.add(stems, caps);

  const curlCount = low ? 40 : 90;
  const curls = new THREE.InstancedMesh(curlGeometry(), clayMat, curlCount);
  const curlColors = ['#6d8a62', '#587a68', '#7f9a6a', '#4f6a5e'];
  for (let i = 0; i < curlCount; i++) {
    const anchor = anchors[Math.floor(rng() * anchors.length)]!;
    const a = rng() * Math.PI * 2;
    const r = anchor.r + 0.4 + rng() * 2;
    const x = anchor.x + Math.cos(a) * r;
    const z = anchor.z + Math.sin(a) * r;
    const s = 0.6 + rng() * 0.9;
    q.setFromAxisAngle(up, rng() * Math.PI * 2);
    curls.setMatrixAt(i, m.compose(p.set(x, ctx.heightAt(x, z), z), q, sc.set(s, s, s)));
    curls.setColorAt(i, c.set(curlColors[i % curlColors.length]!));
  }
  curls.computeBoundingSphere();
  world.add(curls);

  // 7) Árbol central (modelo real) con un anillo de cuarzos en sus raíces.
  if (centerTree) {
    const tree = centerTree.clone(true);
    tree.scale.setScalar(5);
    tree.position.set(0, ctx.heightAt(0, 0) - 0.05, 0);
    tree.rotation.y = 0.6;
    tree.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    world.add(tree);
    ctx.addCollider(0, 0, 1.8);
  }
  const quartzColors = ['#f4c6d6', '#d8c4ff', '#fff1d6', '#c7e6f5'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.3;
    const r = 3.6 + rng() * 1.2;
    const cluster = quartzCluster(quartzColors, 7, 0.9 + rng() * 0.7, rng);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    cluster.position.set(x, ctx.heightAt(x, z), z);
    world.add(cluster);
    ctx.addCollider(x, z, 0.6);
  }
  const treeGlow = new THREE.PointLight('#dcd2ff', 5, 14, 1.5);
  treeGlow.position.set(0, 6, 0);
  world.add(treeGlow);

  buildFence(ctx);
  buildLampPosts(ctx, doorSpots.length);
  buildMist(ctx);

  // 8) Puertas talladas en los troncos.
  return doors.map((door, index) => buildDoorTree(ctx, door, doorSpots[index]!, index));
}

function buildDoorTree(
  ctx: GroveContext,
  door: GroveDoor,
  spot: { x: number; z: number; a: number },
  index: number,
): GroveDoorHandle {
  const theme = themeFor(door.id);
  const tint = new THREE.Color(theme.crystals[0] ?? '#e8b87a');
  const group = new THREE.Group();
  group.position.set(spot.x, ctx.heightAt(spot.x, spot.z) - 0.1, spot.z);
  group.rotation.y = spot.a + Math.PI;

  const front = 2.02;
  const trunk = new THREE.Mesh(
    doorTrunkGeometry(index * 1.7, front),
    barkMaterial(13, 38, '#c9a688'),
  );
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);
  ctx.addCollider(spot.x, spot.z, 2.55);

  const shape = doorShape(door.id);

  // Hueco oscuro y la luz del otro mundo que se cuela por la rendija.
  const recess = new THREE.Mesh(
    scaledShapeGeometry(shape, 1.14),
    new THREE.MeshStandardMaterial({ color: '#1d130d', roughness: 1 }),
  );
  recess.position.z = front + 0.004;
  group.add(recess);
  const leakMat = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(2.2) });
  const leak = new THREE.Mesh(scaledShapeGeometry(shape, 1.07), leakMat);
  leak.position.z = front + 0.01;
  group.add(leak);

  // Hoja de la puerta con bisagra a la izquierda.
  const leaf = new THREE.Group();
  leaf.position.set(-0.98, 0, front + 0.012);
  group.add(leaf);
  const doorGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 32,
  });
  const doorColor = new THREE.Color(DOOR_COLORS[door.id] ?? '#8a5a3a');
  const panel = new THREE.Mesh(
    doorGeo,
    carvedMaterial({
      color: doorColor,
      pattern: 'planks',
      groove: 0.6,
      depth: 1.2,
      roughness: 0.62,
      // Gajos anchos en la calabaza, tablas finas en el resto.
      frequency: door.id === 'halloween' ? 9 : 22,
    }),
  );
  panel.position.x = 0.98;
  panel.castShadow = true;
  leaf.add(panel);

  const brass = new THREE.MeshStandardMaterial({
    color: '#c9a25e',
    metalness: 0.6,
    roughness: 0.35,
  });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), brass);
  knob.position.set(0.98 + 0.55, 1.35, 0.2);
  leaf.add(knob);

  // Adornos de cada símbolo.
  const clay = carvedMaterial({
    color: '#ffffff',
    pattern: 'clay',
    frequency: 6,
    groove: 0.85,
    depth: 0.7,
    glow: 0.15,
  });
  if (door.id === 'felicidad') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), clay);
      ray.material = clay.clone();
      (ray.material as THREE.MeshStandardMaterial).color.set('#f2a24a');
      ray.position.set(0.98 + Math.cos(a) * 1.26, 1.45 + Math.sin(a) * 1.26, 0.08);
      ray.rotation.z = a - Math.PI / 2;
      leaf.add(ray);
    }
  }
  const tinted = (hex: string) => {
    const material = clay.clone();
    material.color.set(hex);
    return material;
  };
  if (door.id === 'navidad') {
    const ornaments = ['#d23c3c', '#e8c25a', '#d23c3c', '#5a8fd0', '#e8c25a', '#d23c3c'];
    const spots = [
      [-0.45, 0.6],
      [0.5, 0.75],
      [-0.2, 1.3],
      [0.35, 1.45],
      [-0.15, 2.0],
      [0.2, 2.25],
    ];
    spots.forEach(([x, y], i) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), tinted(ornaments[i]!));
      ball.position.set(0.98 + x!, y!, 0.2);
      leaf.add(ball);
    });
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.26 : 0.11;
      const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
      if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(star, { depth: 0.06, bevelEnabled: false }),
      tinted('#e8c25a'),
    );
    starMesh.position.set(0.98, 2.92, 0.08);
    leaf.add(starMesh);
  }
  if (door.id === 'halloween') {
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.02, 0.28, 0),
          new THREE.Vector3(0.2, 0.42, 0),
        ),
        12,
        0.08,
        8,
      ),
      tinted('#5a6a32'),
    );
    stem.position.set(0.98, 2.3, 0.1);
    leaf.add(stem);
  }
  if (door.id === 'proteccion') {
    const iris = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32),
      tinted('#8fc0e8'),
    );
    iris.rotation.x = Math.PI / 2;
    iris.position.set(0.98, 1.45, 0.17);
    leaf.add(iris);
    const pupil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
      tinted('#1b2a41'),
    );
    pupil.rotation.x = Math.PI / 2;
    pupil.position.set(0.98, 1.45, 0.2);
    leaf.add(pupil);
  }
  if (door.id === 'abundancia') {
    // Canto de moneda y un sol pequeño acuñado al centro.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 10, 48), brass);
    rim.position.set(0.98, 1.42, 0.17);
    leaf.add(rim);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 6), brass);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0.98, 1.42, 0.18);
    leaf.add(seal);
  }
  if (door.id === 'toritos') {
    // Argolla en el hocico y ojos de cerámica.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 24), brass);
    ring.position.set(0.98, 0.42, 0.2);
    leaf.add(ring);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), tinted('#efe2c9'));
      eye.position.set(0.98 + side * 0.32, 1.55, 0.17);
      eye.scale.z = 0.5;
      leaf.add(eye);
    }
  }
  if (door.id === 'suerte') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.08 + (i / 6) * 0.84);
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), brass);
      nail.position.set(0.98 + Math.cos(a) * 0.73, 1.6 + Math.sin(a) * 0.73, 0.18);
      leaf.add(nail);
    }
  }
  if (door.id === 'mixto') {
    const chakra = ['#c8584a', '#e08a3e', '#e6c45a', '#6fa86a', '#5a8fc0', '#6a5fb0', '#a678c0'];
    chakra.forEach((hex, i) => {
      const bead = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), clay.clone());
      (bead.material as THREE.MeshStandardMaterial).color.set(hex);
      bead.position.set(0.98, 0.55 + i * 0.3, 0.2);
      bead.scale.set(1, 1.3, 0.6);
      leaf.add(bead);
    });
  }

  // Lo que hay al pie de cada puerta depende de su mundo.
  decorateDoorBase(ctx, group, door.id, theme, front);

  ctx.world.add(group);

  let glow = 0;
  let opening = -1;
  ctx.addUpdater((time, dt) => {
    const flicker = 1 + Math.sin(time * 2.1 + index) * 0.08;
    leakMat.color.copy(tint).multiplyScalar((1.6 + glow * 3) * flicker);
    if (opening >= 0) {
      opening = Math.min(opening + dt / 0.7, 1);
      const e = 1 - (1 - opening) ** 3;
      leaf.rotation.y = -1.75 * e;
      leakMat.color.multiplyScalar(1 + e * 2);
    }
  });

  return {
    id: door.id,
    group,
    setGlow(value) {
      glow = value;
    },
    open() {
      if (opening < 0) opening = 0;
    },
  };
}

/** Cerca rústica de postes y dos travesaños que encierra el claro. */
function buildFence(ctx: GroveContext): void {
  const { world, rng } = ctx;
  const wood = carvedMaterial({
    color: '#6a4a34',
    pattern: 'planks',
    groove: 0.55,
    depth: 1,
    frequency: 40,
    roughness: 0.9,
  });
  const spacing = 2.3;
  const count = Math.round((Math.PI * 2 * FENCE_RADIUS) / spacing);
  const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 1, 7);
  postGeo.translate(0, 0.5, 0);
  const railGeo = new THREE.BoxGeometry(1, 0.09, 0.07);
  const posts = new THREE.InstancedMesh(postGeo, wood, count);
  const rails = new THREE.InstancedMesh(railGeo, wood, count * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const tops: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.sin(a) * FENCE_RADIUS;
    const z = Math.cos(a) * FENCE_RADIUS;
    const y = ctx.heightAt(x, z);
    const h = 1.35 + rng() * 0.35;
    q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.08, rng() * 6, (rng() - 0.5) * 0.08));
    posts.setMatrixAt(i, m.compose(p.set(x, y - 0.1, z), q, s.set(1, h, 1)));
    tops.push(new THREE.Vector3(x, y, z));
  }
  let r = 0;
  for (let i = 0; i < count; i++) {
    const a = tops[i]!;
    const b = tops[(i + 1) % count]!;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b) + 0.15;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    for (const height of [0.5, 1.05]) {
      q.setFromEuler(new THREE.Euler(0, yaw, (rng() - 0.5) * 0.06));
      rails.setMatrixAt(
        r++,
        m.compose(p.set(mid.x, mid.y + height + (rng() - 0.5) * 0.05, mid.z), q, s.set(len, 1, 1)),
      );
    }
  }
  posts.computeBoundingSphere();
  rails.computeBoundingSphere();
  posts.castShadow = rails.castShadow = true;
  posts.receiveShadow = rails.receiveShadow = true;
  world.add(posts, rails);
}

/** Faroles de madera con luz amarilla tenue entre las puertas. */
function buildLampPosts(ctx: GroveContext, doorCount: number): void {
  const { world, rng } = ctx;
  const wood = carvedMaterial({
    color: '#5a3d2a',
    pattern: 'planks',
    groove: 0.55,
    depth: 1,
    frequency: 36,
    roughness: 0.9,
  });
  const iron = new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.6, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#ffd58a',
    emissive: '#ffbf5e',
    emissiveIntensity: 3.2,
    roughness: 0.3,
  });
  // Entre cada par de puertas y uno en el hueco del sur (frente al árbol).
  const angles = [0];
  for (let i = 0; i < doorCount - 1; i++) angles.push(doorAngle(i + 0.5, doorCount));
  const radius = 21.5;
  const lights: THREE.PointLight[] = [];
  for (const angle of angles) {
    const lamp = new THREE.Group();
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    lamp.position.set(x, ctx.heightAt(x, z) - 0.05, z);
    // El brazo apunta hacia el centro del claro.
    lamp.rotation.y = angle + Math.PI;
    lamp.rotation.z = (rng() - 0.5) * 0.04;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 3.4, 8), wood);
    post.position.y = 1.7;
    post.castShadow = true;
    lamp.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.85), wood);
    arm.position.set(0, 3.25, 0.38);
    lamp.add(arm);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), wood);
    brace.position.set(0, 3.02, 0.2);
    brace.rotation.x = -0.75;
    lamp.add(brace);

    const lantern = new THREE.Group();
    lantern.position.set(0, 2.82, 0.72);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), glass);
    lantern.add(box);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03), iron);
        bar.position.set(sx * 0.135, 0, sz * 0.135);
        lantern.add(bar);
      }
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), iron);
    cap.position.y = 0.25;
    cap.rotation.y = Math.PI / 4;
    lantern.add(cap);
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 4), iron);
    hook.position.y = 0.38;
    lantern.add(hook);
    lamp.add(lantern);

    const light = new THREE.PointLight('#ffab45', 22, 20, 1.3);
    light.position.copy(lantern.position);
    lamp.add(light);
    lights.push(light);
    lamp.updateMatrixWorld(true);
    ctx.addLamp?.(lantern.getWorldPosition(new THREE.Vector3()));

    world.add(lamp);
    ctx.addCollider(x, z, 0.35);
  }
  ctx.addUpdater((time) => {
    lights.forEach((light, i) => {
      light.intensity =
        22 * (1 + Math.sin(time * 3.1 + i * 1.7) * 0.05 + Math.sin(time * 7.3 + i) * 0.03);
    });
  });
}

/* ------------------------------------------------------------------ pie de las puertas */

function decorateDoorBase(
  ctx: GroveContext,
  group: THREE.Group,
  id: string,
  theme: WorldTheme,
  front: number,
): void {
  const { rng } = ctx;
  switch (id) {
    case 'navidad': {
      // Nieve en las faldas del árbol y regalos.
      const snow = new THREE.MeshStandardMaterial({ color: '#eef3fb', roughness: 0.85 });
      const blob = new THREE.SphereGeometry(1, 18, 12);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = 2.55 + rng() * 0.5;
        const mound = new THREE.Mesh(blob, snow);
        mound.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
        mound.scale.set(0.8 + rng() * 0.5, 0.18 + rng() * 0.14, 0.6 + rng() * 0.4);
        mound.rotation.y = rng() * 6;
        mound.receiveShadow = true;
        group.add(mound);
      }
      for (let i = 0; i < 6; i++) {
        const mound = new THREE.Mesh(blob, snow);
        mound.position.set((rng() - 0.5) * 3.6, 0.02, front + 0.6 + rng() * 1.4);
        mound.scale.set(0.7 + rng() * 0.6, 0.14 + rng() * 0.1, 0.5 + rng() * 0.4);
        mound.receiveShadow = true;
        group.add(mound);
      }
      const gifts: [number, number, number, string, string][] = [
        [-1.55, 0.55, 0.42, '#b8343a', '#e8c25a'],
        [-1.05, 0.38, 0.3, '#2f6a4a', '#f1e3c8'],
        [1.5, 0.48, 0.38, '#e8c25a', '#b8343a'],
      ];
      for (const [x, h, w, color, ribbon] of gifts) {
        const gift = giftBox(h, w, color, ribbon);
        gift.position.set(x, 0, front + 0.55 + rng() * 0.3);
        gift.rotation.y = (rng() - 0.5) * 0.8;
        group.add(gift);
      }
      break;
    }
    case 'halloween': {
      // Calabazas, telarañas y arañas colgando.
      const spots: [number, number, number][] = [
        [-1.6, 0.62, 0.5],
        [-1.05, 0.95, 0.32],
        [1.55, 0.7, 0.55],
        [2.1, 0.4, 0.3],
      ];
      for (const [x, dz, size] of spots) {
        const pumpkin = pumpkinMesh(size, rng);
        pumpkin.position.set(x, 0, front + dz);
        group.add(pumpkin);
      }
      const webTex = webTexture();
      for (const side of [-1, 1]) {
        const web = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 1.3),
          new THREE.MeshBasicMaterial({
            map: webTex,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        web.position.set(side * 1.35, 3.0, front + 0.03);
        web.rotation.z = side * 0.4;
        group.add(web);
      }
      const hangers: { group: THREE.Group; top: number }[] = [];
      const threads: [number, number, number][] = [
        [-0.9, 3.7, 1.1],
        [1.1, 3.9, 1.6],
      ];
      for (const [x, top, len] of threads) {
        const hanger = new THREE.Group();
        hanger.position.set(x, top, front + 0.35);
        const thread = new THREE.Mesh(
          new THREE.CylinderGeometry(0.004, 0.004, len, 3),
          new THREE.MeshBasicMaterial({ color: '#d8d8e0', transparent: true, opacity: 0.6 }),
        );
        thread.position.y = -len / 2;
        hanger.add(thread);
        const spider = spiderMesh();
        spider.position.y = -len;
        hanger.add(spider);
        group.add(hanger);
        hangers.push({ group: hanger, top });
      }
      ctx.addUpdater((time) => {
        hangers.forEach((hanger, i) => {
          hanger.group.rotation.z = Math.sin(time * 0.9 + i * 2) * 0.06;
          hanger.group.position.y = hanger.top + Math.sin(time * 0.6 + i) * 0.08;
        });
      });
      break;
    }
    case 'toritos': {
      // Una pareja de toritos de cerámica, como los de los techos andinos.
      for (const side of [-1, 1]) {
        const torito = toritoMesh();
        torito.position.set(side * 1.55, 0, front + 0.65);
        torito.rotation.y = side * -0.5 + (side > 0 ? Math.PI : 0);
        group.add(torito);
      }
      break;
    }
    case 'cuarzos': {
      for (const side of [-1, 1]) {
        const cluster = quartzCluster(
          ['#ffffff', '#efe6ff', '#e6f2ff'],
          8,
          1.15 + rng() * 0.3,
          rng,
        );
        cluster.position.set(side * 1.55, 0, front + 0.6);
        group.add(cluster);
      }
      break;
    }
    default: {
      // Piedras de la intención.
      for (const side of [-1, 1]) {
        const cluster = quartzCluster(theme.crystals.slice(0, 2), 5, 0.7 + rng() * 0.3, rng);
        cluster.position.set(side * (1.45 + rng() * 0.25), 0, front + 0.45);
        group.add(cluster);
      }
    }
  }
}

function giftBox(height: number, width: number, color: string, ribbon: string): THREE.Group {
  const gift = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const band = new THREE.MeshStandardMaterial({ color: ribbon, roughness: 0.35, metalness: 0.2 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), paper);
  box.position.y = height / 2;
  box.castShadow = true;
  gift.add(box);
  for (const rot of [0, Math.PI / 2]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.01, height + 0.01, width * 0.16),
      band,
    );
    strip.position.y = height / 2;
    strip.rotation.y = rot;
    gift.add(strip);
  }
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(width * 0.16, width * 0.05, 8, 16), band);
    loop.position.set(side * width * 0.13, height + width * 0.12, 0);
    loop.rotation.set(0, Math.PI / 2, side * 0.6);
    gift.add(loop);
  }
  return gift;
}

function pumpkinMesh(size: number, rng: () => number): THREE.Group {
  const pumpkin = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 40, 24);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ribs = 1 - 0.08 * Math.abs(Math.cos(Math.atan2(z, x) * 4));
    // Achatada y con hundimiento arriba, como una calabaza real.
    const dip = y > 0.7 ? (y - 0.7) * 0.6 : 0;
    pos.setXYZ(i, x * ribs, y * 0.72 - dip, z * ribs);
  }
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: rng() < 0.5 ? '#d8692a' : '#e07c32', roughness: 0.55 }),
  );
  body.position.y = 0.7;
  body.castShadow = true;
  pumpkin.add(body);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 0.35, 6),
    new THREE.MeshStandardMaterial({ color: '#5a5a2a', roughness: 0.9 }),
  );
  stem.position.y = 1.35;
  stem.rotation.z = (rng() - 0.5) * 0.5;
  pumpkin.add(stem);
  pumpkin.scale.setScalar(size);
  return pumpkin;
}

function spiderMesh(): THREE.Group {
  const spider = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#141216', roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), black);
  body.scale.set(1, 1.2, 0.9);
  spider.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), black);
  head.position.y = -0.08;
  spider.add(head);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), black);
      leg.position.set(side * 0.08, -0.07 + i * 0.03, 0);
      leg.rotation.z = side * (1.1 - i * 0.25);
      spider.add(leg);
    }
  }
  return spider;
}

/** Torito de cerámica de Pucará (cuerpo robusto, cuernos hacia arriba, puntos pintados). Mira hacia +x. */
export function toritoMesh(): THREE.Group {
  const torito = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({
    color: '#a9502f',
    roughness: 0.32,
    metalness: 0.02,
  });
  const cream = new THREE.MeshStandardMaterial({ color: '#f1e4c8', roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3a1f14', roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 8, 18), clay);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.92);
  body.position.y = 0.46;
  body.castShadow = true;
  torito.add(body);
  // Joroba y pecho.
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), clay);
  hump.position.set(0.16, 0.6, 0);
  hump.scale.set(1, 0.9, 0.95);
  torito.add(hump);

  const head = new THREE.Group();
  head.position.set(0.5, 0.66, 0);
  head.rotation.z = -0.25;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), clay);
  skull.scale.set(1.05, 1, 0.92);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 14), clay);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(0.15, -0.05, 0);
  head.add(snout);
  const nose = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 16), cream);
  nose.rotation.y = Math.PI / 2;
  nose.position.set(0.26, -0.05, 0);
  head.add(nose);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), cream);
    eye.position.set(0.08, 0.06, side * 0.12);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dark);
    pupil.position.set(0.1, 0.06, side * 0.145);
    head.add(pupil);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 8), clay);
    ear.position.set(-0.04, 0.05, side * 0.17);
    ear.rotation.x = side * 1.2;
    head.add(ear);
    // Cuerno que sale de lado y se curva hacia arriba.
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.02, 0.1, side * 0.1),
      new THREE.Vector3(-0.02, 0.14, side * 0.3),
      new THREE.Vector3(0.04, 0.36, side * 0.3),
    );
    const horn = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.032, 8), cream);
    head.add(horn);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 8), cream);
    tip.position.set(0.045, 0.39, side * 0.3);
    head.add(tip);
  }
  torito.add(head);

  const legs: [number, number][] = [
    [0.26, 0.13],
    [0.26, -0.13],
    [-0.24, 0.13],
    [-0.24, -0.13],
  ];
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.3, 10), clay);
    leg.position.set(x, 0.15, z);
    torito.add(leg);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.075, 0.04, 10), dark);
    hoof.position.set(x, 0.02, z);
    torito.add(hoof);
  }
  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.44, 0.55, 0),
        new THREE.Vector3(-0.55, 0.45, 0),
        new THREE.Vector3(-0.5, 0.28, 0.04),
      ),
      10,
      0.02,
      6,
    ),
    clay,
  );
  torito.add(tail);
  // Decoración pintada: franja y puntos crema, como la cerámica de Pucará.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.016, 6, 28), cream);
  band.rotation.y = Math.PI / 2;
  band.position.set(0.24, 0.46, 0);
  torito.add(band);
  const dot = new THREE.SphereGeometry(0.022, 8, 6);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = -0.18 + (i % 2) * 0.16;
    const d = new THREE.Mesh(dot, cream);
    d.position.set(x, 0.46 + Math.sin(a) * 0.23, Math.cos(a) * 0.21);
    torito.add(d);
  }
  torito.scale.setScalar(1.2);
  return torito;
}

function webTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = 'rgba(230, 232, 240, 0.85)';
  ctx.lineWidth = 1.4;
  const spokes = 9;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
    ctx.stroke();
  }
  for (let r = 14; r < 124; r += 13) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const m = a - Math.PI / spokes;
        ctx.quadraticCurveTo(128 + Math.cos(m) * r * 0.86, 128 + Math.sin(m) * r * 0.86, x, y);
      }
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Bruma baja que gira despacio entre los troncos. */
function buildMist(ctx: GroveContext): void {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c2d = canvas.getContext('2d')!;
  const g = c2d.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c2d.fillStyle = g;
  c2d.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: '#8fa2c8',
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const puffs: { sprite: THREE.Sprite; a: number; r: number; speed: number }[] = [];
  for (let i = 0; i < (ctx.low ? 18 : 34); i++) {
    const sprite = new THREE.Sprite(material);
    const a = ctx.rng() * Math.PI * 2;
    const r = 6 + ctx.rng() * (FENCE_RADIUS + 4);
    sprite.scale.set(9 + ctx.rng() * 6, 2.2 + ctx.rng() * 1.2, 1);
    sprite.position.set(Math.sin(a) * r, 0.7 + ctx.rng() * 0.6, Math.cos(a) * r);
    ctx.world.add(sprite);
    puffs.push({ sprite, a, r, speed: (ctx.rng() - 0.5) * 0.02 });
  }
  ctx.addUpdater((time) => {
    for (const puff of puffs) {
      const a = puff.a + time * puff.speed;
      puff.sprite.position.x = Math.sin(a) * puff.r;
      puff.sprite.position.z = Math.cos(a) * puff.r;
    }
  });
}
