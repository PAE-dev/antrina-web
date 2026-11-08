import * as THREE from 'three';
import { carvedMaterial } from './carved';
import { getCenterTreeTemplate, getGrassMaps, toritoMesh } from './grove';
import {
  boundsOf,
  findClip,
  glaze,
  placeModel,
  toritosAssets,
  type ToritosAssets,
} from './toritos-assets';

/** Orientación de los modelos (se ajusta viendo la escena). */
const HOUSE_FACING = 0;
const BULL_FACING = 0;
const RIDGE_ALONG_Z = true;

/**
 * Mundo de los Toritos: un pueblito andino al atardecer. Casitas de adobe con techo de teja y una
 * pareja de toritos de cerámica en el caballete (la tradición del techamiento para la prosperidad),
 * llamas de cerámica, un río y un puente artesanal de soga, una plaza con toritos grandes y un
 * cartel que cuenta la costumbre. Todo es geometría propia.
 */

export const TORITOS_ID = 'toritos';

const RIVER_HALF = 2.6;
const BRIDGE_HALF = 1.25;
const BRIDGE_LENGTH = 11.5;
export const WATER_Y = -0.55;

export interface ToritosSign {
  title: string;
  body: string;
}

export interface ToritosContext {
  world: THREE.Group;
  rng: () => number;
  low: boolean;
  heightAt(x: number, z: number): number;
  addCollider(x: number, z: number, r: number): void;
  addUpdater(update: (time: number, dt: number) => void): void;
}

/* ------------------------------------------------------------------ terreno */

/** Centro del río (z) para cada x: serpentea de oeste a este. */
export function riverCenterZ(x: number): number {
  return -6 + Math.sin(x * 0.06) * 3.5 + Math.sin(x * 0.17) * 0.8;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Altura del pueblo: lomas suaves, el cauce del río y la tablazón del puente. */
export function toritosHeight(x: number, z: number, rolling: number): number {
  let h = rolling * 0.35;
  const d = Math.abs(z - riverCenterZ(x));
  h -= (1 - smoothstep(RIVER_HALF - 0.4, RIVER_HALF + 2.2, d)) * 1.35;
  const deck = bridgeDeckHeight(x, z);
  if (deck !== null) h = Math.max(h, deck);
  return h;
}

function bridgeDeckHeight(x: number, z: number): number | null {
  if (Math.abs(x) > BRIDGE_HALF) return null;
  const start = riverCenterZ(0) + BRIDGE_LENGTH / 2;
  const t = (start - z) / BRIDGE_LENGTH;
  if (t < 0 || t > 1) return null;
  return 0.2 + Math.sin(Math.PI * t) * 0.6;
}

/** Casas, plaza y caminos: ahí no crece el ichu. */
const HOUSES: { x: number; z: number; rot: number; adobe: boolean }[] = [
  { x: -13, z: 9, rot: 0.5, adobe: false },
  { x: 13, z: 11, rot: -0.45, adobe: true },
  { x: -21, z: 19, rot: 0.9, adobe: true },
  { x: 21, z: 21, rot: -0.9, adobe: false },
  { x: -11, z: -19, rot: 0.2, adobe: true },
  { x: 9, z: -22, rot: -0.15, adobe: false },
  { x: 23, z: -15, rot: -0.6, adobe: true },
  { x: -25, z: -12, rot: 0.7, adobe: false },
];
const PLAZA = new THREE.Vector3(0, 0, 9);

export function toritosOpenGround(x: number, z: number): boolean {
  if (Math.abs(z - riverCenterZ(x)) < RIVER_HALF + 0.6) return false;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 4.2) return false;
  if (Math.abs(x) < 1.1 && z > -26 && z < 28) return false;
  return !HOUSES.some((h) => Math.hypot(x - h.x, z - h.z) < 3.6);
}

/* ------------------------------------------------------------------ construcción */

export function buildToritos(ctx: ToritosContext, sign: ToritosSign): THREE.Vector3 {
  const assets = toritosAssets();
  buildRiver(ctx);
  buildBridge(ctx);
  buildPath(ctx);
  buildSign(ctx, sign);
  if (assets) {
    buildModelGround(ctx);
    buildModelHouses(ctx, assets);
    buildModelPlaza(ctx, assets);
    buildModelAnimals(ctx, assets);
    buildModelTrees(ctx);
  } else {
    // Sin modelos (no cargaron): figuras propias y cordillera de conos.
    for (const house of HOUSES) buildHouse(ctx, house);
    buildPlaza(ctx);
    buildLlamas(ctx);
    buildMolles(ctx);
    buildMountains(ctx);
  }
  return PLAZA.clone();
}

/** El mundo trae su propio suelo y cielo cuando los modelos están cargados. */
export function toritosHasModels(): boolean {
  return toritosAssets() !== null;
}

function waterNormalTexture(): THREE.CanvasTexture {
  const size = 256;
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      height[y * size + x] =
        Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 +
        Math.sin(v * 5 + u * 2) * 0.3 +
        Math.sin((u + v) * 7) * 0.15;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  const image = c.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = (xx: number, yy: number) =>
        height[((yy + size) % size) * size + ((xx + size) % size)]!;
      const dx = (h(x + 1, y) - h(x - 1, y)) * 1.5;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 1.5;
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      const i = (y * size + x) * 4;
      image.data[i] = (n.x * 0.5 + 0.5) * 255;
      image.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      image.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(30, 2);
  return texture;
}

function buildRiver(ctx: ToritosContext): void {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const width = RIVER_HALF + 1.6;
  let i = 0;
  for (let x = -110; x <= 110; x += 2) {
    const zc = riverCenterZ(x);
    positions.push(x, WATER_Y, zc - width, x, WATER_Y, zc + width);
    const u = (x + 110) / 220;
    uvs.push(u, 0, u, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    i++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normalMap = waterNormalTexture();
  const water = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#3f7f86',
      roughness: 0.06,
      metalness: 0.15,
      normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      transparent: true,
      opacity: 0.9,
    }),
  );
  water.receiveShadow = true;
  ctx.world.add(water);
  ctx.addUpdater((time) => {
    normalMap.offset.set(time * 0.035, Math.sin(time * 0.3) * 0.02);
  });
  // No se puede caminar por el agua (salvo por el puente).
  for (let x = -80; x <= 80; x += 1.6) {
    if (Math.abs(x) < BRIDGE_HALF + 1.4) continue;
    ctx.addCollider(x, riverCenterZ(x), RIVER_HALF + 0.1);
  }
}

function buildBridge(ctx: ToritosContext): void {
  const { world, rng } = ctx;
  const wood = carvedMaterial({
    color: '#8a6440',
    pattern: 'planks',
    groove: 0.6,
    depth: 1,
    frequency: 30,
    roughness: 0.9,
  });
  const rope = new THREE.MeshStandardMaterial({ color: '#c4a466', roughness: 0.95 });
  const start = riverCenterZ(0) + BRIDGE_LENGTH / 2;
  const deckAt = (t: number) => 0.2 + Math.sin(Math.PI * t) * 0.6;
  const planks = 28;
  const plankGeo = new THREE.BoxGeometry(BRIDGE_HALF * 2.1, 0.08, 0.34);
  for (let i = 0; i < planks; i++) {
    const t = (i + 0.5) / planks;
    const plank = new THREE.Mesh(plankGeo, wood);
    plank.position.set((rng() - 0.5) * 0.06, deckAt(t) - 0.04, start - t * BRIDGE_LENGTH);
    plank.rotation.set(Math.cos(Math.PI * t) * 0.17, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.03);
    plank.castShadow = plank.receiveShadow = true;
    world.add(plank);
  }
  // Postes en los extremos y pasamanos de soga trenzada con colgantes.
  const postGeo = new THREE.CylinderGeometry(0.1, 0.13, 1.6, 8);
  for (const side of [-1, 1]) {
    for (const t of [0, 1]) {
      const post = new THREE.Mesh(postGeo, wood);
      post.position.set(side * (BRIDGE_HALF + 0.15), deckAt(t) + 0.55, start - t * BRIDGE_LENGTH);
      post.castShadow = true;
      world.add(post);
    }
    const points: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const sag = Math.sin(Math.PI * t) * 0.25;
      points.push(
        new THREE.Vector3(
          side * (BRIDGE_HALF + 0.15),
          deckAt(t) + 1.25 - sag,
          start - t * BRIDGE_LENGTH,
        ),
      );
    }
    for (const offset of [0, -0.45]) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => p.clone().setY(p.y + offset)));
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, offset === 0 ? 0.045 : 0.03, 6),
        rope,
      );
      line.castShadow = true;
      world.add(line);
    }
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const top = deckAt(t) + 1.25 - Math.sin(Math.PI * t) * 0.25;
      const bottom = deckAt(t);
      const hanger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, top - bottom, 5),
        rope,
      );
      hanger.position.set(
        side * (BRIDGE_HALF + 0.12),
        (top + bottom) / 2,
        start - t * BRIDGE_LENGTH,
      );
      world.add(hanger);
      ctx.addCollider(side * (BRIDGE_HALF + 0.3), start - t * BRIDGE_LENGTH, 0.22);
    }
  }
}

function buildPath(ctx: ToritosContext): void {
  const { world, rng } = ctx;
  const stones: THREE.Vector3[] = [];
  const start = riverCenterZ(0) + BRIDGE_LENGTH / 2;
  const end = start - BRIDGE_LENGTH;
  for (let z = 27; z > start + 0.5; z -= 0.85) stones.push(new THREE.Vector3(0, 0, z));
  for (let z = end - 0.8; z > -26; z -= 0.85) stones.push(new THREE.Vector3(0, 0, z));
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.5, 0.55, 0.12, 9),
    new THREE.MeshStandardMaterial({ color: '#9a8a74', roughness: 0.95, flatShading: true }),
    stones.length * 2,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let i = 0;
  for (const s of stones) {
    for (const side of [-0.45, 0.45]) {
      const x = s.x + side + (rng() - 0.5) * 0.25;
      const z = s.z + (rng() - 0.5) * 0.25;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6);
      const k = 0.7 + rng() * 0.4;
      mesh.setMatrixAt(
        i++,
        m.compose(
          new THREE.Vector3(x, ctx.heightAt(x, z) + 0.02, z),
          q,
          new THREE.Vector3(k, 1, k * 0.85),
        ),
      );
    }
  }
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  world.add(mesh);
}

/** Casita andina: adobe o encalada, puerta y ventanas azules, techo de teja y toritos. */
function buildHouse(
  ctx: ToritosContext,
  house: { x: number; z: number; rot: number; adobe: boolean },
): void {
  const group = new THREE.Group();
  group.position.set(house.x, ctx.heightAt(house.x, house.z) - 0.1, house.z);
  // Mira hacia la plaza.
  group.rotation.y = Math.atan2(PLAZA.x - house.x, PLAZA.z - house.z) + house.rot * 0.3;
  const wallColor = house.adobe ? '#c98f5c' : '#efe5d2';
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 2.8, 3.6),
    carvedMaterial({ color: wallColor, pattern: 'clay', frequency: 2.2, groove: 0.86, depth: 0.6 }),
  );
  walls.position.y = 1.4;
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(4.52, 0.45, 3.72),
    new THREE.MeshStandardMaterial({ color: '#7a4e34', roughness: 0.95 }),
  );
  plinth.position.y = 0.22;
  group.add(plinth);

  const blue = new THREE.MeshStandardMaterial({ color: '#2f6aa6', roughness: 0.6 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.1), blue);
  door.position.set(0, 0.95, 1.82);
  group.add(door);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#c9a25e', metalness: 0.6, roughness: 0.4 }),
  );
  knob.position.set(0.3, 0.95, 1.89);
  group.add(knob);
  const glass = new THREE.MeshStandardMaterial({
    color: '#ffd48a',
    emissive: '#ffb860',
    emissiveIntensity: 0.9,
  });
  for (const side of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.06), glass);
    pane.position.set(side * 1.35, 1.65, 1.81);
    group.add(pane);
    for (const s of [-1, 1]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.05), blue);
      shutter.position.set(side * 1.35 + s * 0.55, 1.65, 1.84);
      group.add(shutter);
    }
  }

  // Techo a dos aguas de teja.
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.65, 0);
  roofShape.lineTo(2.65, 0);
  roofShape.lineTo(0, 1.55);
  roofShape.lineTo(-2.65, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 4.3, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.15);
  roofGeo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(
    roofGeo,
    carvedMaterial({ color: '#b2502e', pattern: 'planks', frequency: 34, groove: 0.6, depth: 1.4 }),
  );
  roof.position.y = 2.8;
  roof.castShadow = roof.receiveShadow = true;
  group.add(roof);
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 4.5, 8),
    new THREE.MeshStandardMaterial({ color: '#9a4428', roughness: 0.8 }),
  );
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(0, 4.36, 0);
  group.add(ridge);

  // La pareja de toritos en el caballete, mirando al frente.
  for (const side of [-1, 1]) {
    const torito = toritoMesh();
    torito.scale.setScalar(0.62);
    torito.rotation.y = -Math.PI / 2;
    torito.position.set(side * 0.42, 4.4, 0.25);
    group.add(torito);
  }

  ctx.world.add(group);
  ctx.addCollider(house.x, house.z, 2.7);
}

function buildPlaza(ctx: ToritosContext): void {
  const stone = new THREE.MeshStandardMaterial({
    color: '#a89a84',
    roughness: 0.9,
    flatShading: true,
  });
  const y = ctx.heightAt(PLAZA.x, PLAZA.z);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.18, 24), stone);
  floor.position.set(PLAZA.x, y, PLAZA.z);
  floor.receiveShadow = true;
  ctx.world.add(floor);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.0, 8), stone);
  base.position.set(PLAZA.x, y + 0.55, PLAZA.z);
  base.castShadow = base.receiveShadow = true;
  ctx.world.add(base);
  // Toritos grandes de cerámica, frente a frente.
  for (const side of [-1, 1]) {
    const torito = toritoMesh();
    torito.scale.setScalar(2.1);
    torito.rotation.y = side > 0 ? Math.PI : 0;
    torito.position.set(PLAZA.x + side * 0.85, y + 1.05, PLAZA.z);
    torito.traverse((o) => {
      (o as THREE.Mesh).castShadow = true;
    });
    ctx.world.add(torito);
  }
  ctx.addCollider(PLAZA.x, PLAZA.z, 1.9);
}

/** Llama de cerámica esmaltada con manta y borlas de colores. Mira hacia +x. */
function llamaMesh(rng: () => number): THREE.Group {
  const llama = new THREE.Group();
  const glaze = new THREE.MeshStandardMaterial({ color: '#f1e8d6', roughness: 0.35 });
  const brown = new THREE.MeshStandardMaterial({ color: '#6a4a32', roughness: 0.5 });
  const colors = ['#c0392b', '#e08a2e', '#2f6aa6', '#7a3f9a', '#2f8a5a'];
  const blanketMat = new THREE.MeshStandardMaterial({
    color: colors[Math.floor(rng() * colors.length)],
    roughness: 0.7,
  });
  const tassel = new THREE.MeshStandardMaterial({ color: '#e0457b', roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), glaze);
  body.scale.set(1.35, 0.85, 0.75);
  body.position.y = 0.95;
  body.castShadow = true;
  llama.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.85, 10), glaze);
  neck.position.set(0.42, 1.42, 0);
  neck.rotation.z = -0.25;
  llama.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), glaze);
  head.scale.set(1.35, 0.9, 0.85);
  head.position.set(0.58, 1.86, 0);
  llama.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), glaze);
    ear.position.set(0.5, 2.05, side * 0.08);
    llama.add(ear);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), tassel);
    bob.position.set(0.5, 2.0, side * 0.12);
    llama.add(bob);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), brown);
    eye.position.set(0.7, 1.9, side * 0.1);
    llama.add(eye);
  }
  const legs: [number, number][] = [
    [0.32, 0.17],
    [0.32, -0.17],
    [-0.32, 0.17],
    [-0.32, -0.17],
  ];
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), glaze);
    leg.position.set(x, 0.38, z);
    llama.add(leg);
  }
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.66), blanketMat);
  blanket.position.set(0.02, 1.27, 0);
  llama.add(blanket);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.07, 0.67),
    new THREE.MeshStandardMaterial({ color: '#f2c14e', roughness: 0.7 }),
  );
  stripe.position.set(0.02, 1.28, 0);
  llama.add(stripe);
  return llama;
}

function buildLlamas(ctx: ToritosContext): void {
  const spots: [number, number, number][] = [
    [5.5, 15, 2.3],
    [-6, 13.5, 0.4],
    [-4.5, 20, 1.2],
    [16, -7, 2.8],
    [-17, -24, 0.7],
    [4, -16, -1.0],
    [27, 6, 3.4],
  ];
  for (const [x, z, rot] of spots) {
    const llama = llamaMesh(ctx.rng);
    const s = 0.9 + ctx.rng() * 0.35;
    llama.scale.setScalar(s);
    llama.position.set(x, ctx.heightAt(x, z), z);
    llama.rotation.y = rot;
    ctx.world.add(llama);
    ctx.addCollider(x, z, 0.7 * s);
  }
}

function wrapText(c: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Cartel de madera con la tradición, junto al camino. */
function buildSign(ctx: ToritosContext, sign: ToritosSign): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 680;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#efe3c8';
  c.fillRect(0, 0, canvas.width, canvas.height);
  // Vetas suaves del papel.
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgba(140, 100, 60, ${0.03 + ctx.rng() * 0.04})`;
    c.fillRect(0, ctx.rng() * canvas.height, canvas.width, 1 + ctx.rng() * 2);
  }
  c.strokeStyle = '#9a4f2f';
  c.lineWidth = 6;
  c.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
  c.fillStyle = '#b8643f';
  c.save();
  c.translate(512, 92);
  c.rotate(Math.PI / 4);
  c.fillRect(-9, -9, 18, 18);
  c.restore();
  c.textAlign = 'center';
  c.fillStyle = '#1b2a41';
  c.font = '600 64px Fraunces, Georgia, serif';
  c.fillText(sign.title, 512, 180);
  c.font = '400 33px "DM Sans", system-ui, sans-serif';
  c.fillStyle = '#2c3a50';
  const lines = wrapText(c, sign.body, 860);
  lines.forEach((line, i) => c.fillText(line, 512, 255 + i * 48));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const group = new THREE.Group();
  const x = 3.4;
  const z = 16.5;
  group.position.set(x, ctx.heightAt(x, z), z);
  group.rotation.y = -0.35;
  const wood = carvedMaterial({ color: '#6a4a30', pattern: 'planks', frequency: 26, groove: 0.6 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.85, 0.1), wood);
  board.position.y = 1.85;
  board.castShadow = true;
  group.add(board);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.5 * (680 / 1024)),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }),
  );
  face.position.set(0, 1.85, 0.056);
  group.add(face);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.4), wood);
  roof.position.set(0, 2.85, 0.05);
  roof.rotation.x = 0.15;
  group.add(roof);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.9, 8), wood);
    post.position.set(side * 1.25, 1.45, -0.08);
    post.castShadow = true;
    group.add(post);
  }
  ctx.world.add(group);
  ctx.addCollider(x, z, 1.2);
}

/** Molles (árbol andino): tronco torcido y copa redonda. */
function buildMolles(ctx: ToritosContext): void {
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a3e2a', roughness: 0.95 });
  const leaves = carvedMaterial({
    color: '#6f8a3e',
    pattern: 'clay',
    frequency: 1.6,
    groove: 0.6,
    depth: 2,
  });
  const spots: [number, number][] = [
    [-30, 4],
    [31, -2],
    [-6, -31],
    [17, 31],
    [-33, 28],
    [36, -26],
  ];
  for (const [x, z] of spots) {
    const tree = new THREE.Group();
    tree.position.set(x, ctx.heightAt(x, z) - 0.1, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.42, 3.4, 8), trunkMat);
    trunk.position.y = 1.7;
    trunk.rotation.z = (ctx.rng() - 0.5) * 0.25;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let k = 0; k < 5; k++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), leaves);
      const s = 1.4 + ctx.rng() * 0.9;
      blob.scale.set(s, s * 0.7, s);
      blob.position.set((ctx.rng() - 0.5) * 2.4, 3.8 + ctx.rng() * 1.2, (ctx.rng() - 0.5) * 2.4);
      blob.castShadow = true;
      tree.add(blob);
    }
    ctx.world.add(tree);
    ctx.addCollider(x, z, 0.6);
  }
}

/** Cordillera al fondo, con nieve en las cumbres. */
function buildMountains(ctx: ToritosContext): void {
  const rock = new THREE.MeshStandardMaterial({
    color: '#8a6450',
    roughness: 1,
    flatShading: true,
  });
  const snow = new THREE.MeshStandardMaterial({
    color: '#f4f2ee',
    roughness: 0.9,
    flatShading: true,
  });
  const count = 18;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + ctx.rng() * 0.2;
    const r = 135 + ctx.rng() * 45;
    const height = 55 + ctx.rng() * 55;
    const radius = 32 + ctx.rng() * 22;
    const mountain = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7, 1), rock);
    body.position.y = height / 2 - 4;
    mountain.add(body);
    const capH = height * 0.28;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.29, capH, 7, 1), snow);
    cap.position.y = height - 4 - capH / 2 + 0.3;
    mountain.add(cap);
    mountain.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    mountain.rotation.y = ctx.rng() * 6;
    ctx.world.add(mountain);
  }
}

/* ------------------------------------------------------------------ con modelos reales */

/** Giro del HDRI: deja el sol de la tarde a la izquierda del camino de entrada. */
export const TORITOS_SKY_ROTATION = 3.04;
/** Dirección del sol del HDRI una vez girado (para la luz y las sombras). */
export const TORITOS_SUN_DIR = new THREE.Vector3(0.81, 0.28, 0.51)
  .normalize()
  .applyEuler(new THREE.Euler(0, TORITOS_SKY_ROTATION, 0));

const TERRACOTTA = '#a64a2a';
const CREAM = '#f3e6c9';

/** Torito de cerámica a partir del toro de Quaternius. Mira hacia +z del modelo. */
function ceramicBull(assets: ToritosAssets, length: number): THREE.Group {
  const bull = placeModel(assets.bull.scene, { length }, true);
  glaze(bull, TERRACOTTA, CREAM);
  return bull;
}

function ceramicLlama(assets: ToritosAssets, height: number): THREE.Group {
  const llama = placeModel(assets.llama.scene, { height }, true);
  glaze(llama, '#c9733f', CREAM);
  return llama;
}

function buildModelHouses(ctx: ToritosContext, assets: ToritosAssets): void {
  HOUSES.forEach((house, index) => {
    const model = assets.houses[index % assets.houses.length]!;
    const group = placeModel(model.scene, { length: 6.4 });
    const y = ctx.heightAt(house.x, house.z) - 0.05;
    group.position.set(house.x, y, house.z);
    group.rotation.y = Math.atan2(PLAZA.x - house.x, PLAZA.z - house.z) + HOUSE_FACING;
    ctx.world.add(group);
    // Pareja de toritos en el caballete del techo.
    const box = boundsOf(group);
    const top = box.max.y;
    for (const side of [-1, 1]) {
      const torito = ceramicBull(assets, 1.35);
      const local = new THREE.Vector3(side * 0.75, 0, 0);
      if (RIDGE_ALONG_Z) local.set(0, 0, side * 0.75);
      local.applyEuler(new THREE.Euler(0, group.rotation.y, 0));
      torito.position.set(house.x + local.x, top - 0.12, house.z + local.z);
      torito.rotation.y = group.rotation.y + BULL_FACING;
      ctx.world.add(torito);
    }
    // Cerámica y canasta junto a la puerta.
    const front = new THREE.Vector3(
      Math.sin(group.rotation.y - HOUSE_FACING),
      0,
      Math.cos(group.rotation.y - HOUSE_FACING),
    );
    const sideways = new THREE.Vector3(front.z, 0, -front.x);
    const props: [string, number, number, number][] = [
      ['ceramic_vase_02', 0.75, 2.1, 1.6],
      ['jug_01', 0.45, -2.0, 1.9],
      ['planter_pot_clay', 0.5, 2.6, 2.4],
      ['wicker_basket_01', 0.55, -2.6, 2.5],
    ];
    props.forEach(([name, height, across, out], k) => {
      if ((index + k) % 2 === 1) return;
      const gltf = assets.props[name];
      if (!gltf) return;
      const prop = placeModel(gltf.scene, { height });
      const px = house.x + front.x * (out + 1.2) + sideways.x * across;
      const pz = house.z + front.z * (out + 1.2) + sideways.z * across;
      prop.position.set(px, ctx.heightAt(px, pz), pz);
      prop.rotation.y = ctx.rng() * Math.PI * 2;
      ctx.world.add(prop);
    });
    ctx.addCollider(house.x, house.z, 3.1);
  });
  // Una rueca de hilar frente a la primera casa: la lana de las alpacas.
  const wheel = assets.props.spinning_wheel_01;
  if (wheel) {
    const spinner = placeModel(wheel.scene, { height: 1.4 });
    spinner.position.set(-8.5, ctx.heightAt(-8.5, 12.5), 12.5);
    spinner.rotation.y = 0.9;
    ctx.world.add(spinner);
    ctx.addCollider(-8.5, 12.5, 0.7);
  }
}

function buildModelPlaza(ctx: ToritosContext, assets: ToritosAssets): void {
  const stone = new THREE.MeshStandardMaterial({
    color: '#b0a088',
    roughness: 0.9,
    flatShading: true,
  });
  const y = ctx.heightAt(PLAZA.x, PLAZA.z);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.18, 32), stone);
  floor.position.set(PLAZA.x, y, PLAZA.z);
  floor.receiveShadow = true;
  ctx.world.add(floor);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.9, 10), stone);
  base.position.set(PLAZA.x, y + 0.5, PLAZA.z);
  base.castShadow = base.receiveShadow = true;
  ctx.world.add(base);
  // Pareja grande de toritos de cerámica, uno junto al otro, mirando al camino.
  for (const side of [-1, 1]) {
    const torito = ceramicBull(assets, 2.4);
    torito.position.set(PLAZA.x + side * 0.7, y + 0.95, PLAZA.z);
    torito.rotation.y = BULL_FACING;
    ctx.world.add(torito);
  }
  ctx.addCollider(PLAZA.x, PLAZA.z, 2);
}

function buildModelAnimals(ctx: ToritosContext, assets: ToritosAssets): void {
  // Llamas de cerámica junto al camino.
  const ceramic: [number, number, number][] = [
    [5.5, 15, 2.3],
    [-6, 13.5, 0.4],
    [4, -16, -1.0],
  ];
  for (const [x, z, rot] of ceramic) {
    const llama = ceramicLlama(assets, 1.7);
    llama.position.set(x, ctx.heightAt(x, z), z);
    llama.rotation.y = rot;
    ctx.world.add(llama);
    ctx.addCollider(x, z, 0.7);
  }
  // Alpacas vivas pastando por el pueblo.
  const grazing: [number, number, number][] = [
    [16, -7, 2.8],
    [-17, -24, 0.7],
    [27, 6, 3.4],
    [-24, 4, 1.6],
    [12, 27, -0.6],
  ];
  const clip = findClip(assets.alpaca, ['eating', 'eat', 'idle']);
  for (const [x, z, rot] of grazing) {
    const alpaca = placeModel(assets.alpaca.scene, { length: 1.7 }, true);
    alpaca.position.set(x, ctx.heightAt(x, z), z);
    alpaca.rotation.y = rot;
    ctx.world.add(alpaca);
    ctx.addCollider(x, z, 0.8);
    if (clip) {
      const mixer = new THREE.AnimationMixer(alpaca);
      const action = mixer.clipAction(clip);
      action.time = ctx.rng() * clip.duration;
      action.play();
      ctx.addUpdater((_, dt) => mixer.update(dt));
    }
  }
}

/** Molles con el mismo árbol real del bosque (Poly Haven), más pequeños. */
function buildModelTrees(ctx: ToritosContext): void {
  const template = getCenterTreeTemplate();
  if (!template) {
    buildMolles(ctx);
    return;
  }
  const spots: [number, number][] = [
    [-30, 4],
    [31, -2],
    [-6, -31],
    [17, 31],
    [-33, 28],
    [36, -26],
    [-40, -18],
    [40, 18],
  ];
  for (const [x, z] of spots) {
    const tree = placeModel(template, { height: 8 + ctx.rng() * 3 });
    tree.position.set(x, ctx.heightAt(x, z) - 0.1, z);
    tree.rotation.y = ctx.rng() * Math.PI * 2;
    ctx.world.add(tree);
    ctx.addCollider(x, z, 0.9);
  }
}

/** Suelo de pasto real teñido de dorado (ichu), grande para fundirse con el paisaje del HDRI. */
function buildModelGround(ctx: ToritosContext): void {
  const size = 640;
  const geometry = new THREE.PlaneGeometry(size, size, ctx.low ? 120 : 180, ctx.low ? 120 : 180);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, ctx.heightAt(pos.getX(i), pos.getZ(i)));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#b8925a', roughness: 1 });
  const maps = getGrassMaps();
  if (maps) {
    const repeat = (texture: THREE.Texture) => {
      const copy = texture.clone();
      copy.repeat.set(size / 2.4, size / 2.4);
      copy.needsUpdate = true;
      return copy;
    };
    material.map = repeat(maps.map);
    material.normalMap = repeat(maps.normal);
    material.roughnessMap = repeat(maps.arm);
  }
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  ctx.world.add(ground);
}
