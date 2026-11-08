/**
 * Paletas y ambiente de cada mundo del bosque 3D. Es arte de escena (cielo, luz, cristales), no UI:
 * por eso los colores viven aquí y no en los tokens de la tienda. La UI encima del canvas sí usa
 * los tokens "Marino".
 *
 * `hub` es el Bosque de las Intenciones (inicio). El resto se indexa por la categoría de la
 * intención (`INTENTIONS[].category`): cada puerta del bosque lleva a uno de ellos.
 */
export type TreeStyle = 'forest' | 'blossom' | 'pine' | 'round' | 'crystal';
export type ParticleStyle = 'fireflies' | 'petals' | 'stars' | 'sparkles' | 'snow';

export interface WorldTheme {
  sky: { top: string; horizon: string; bottom: string; sun: string };
  /** Densidad de niebla exponencial (más alta = mundo más íntimo). */
  fog: number;
  /** Color de la niebla; por defecto el del horizonte. */
  fogColor?: string;
  light: { hemiSky: string; hemiGround: string; sun: string; sunIntensity: number };
  ground: string;
  grass: { base: string; tips: string[] };
  trees: { style: TreeStyle; trunk: string; canopy: string[]; count: number };
  /** Cristales esparcidos por el suelo y del árbol central. */
  crystals: string[];
  particles: { style: ParticleStyle; color: string; count: number };
  /** Acorde del sonido ambiente (Hz). */
  chord: number[];
  /** Estrellas y luna en el cielo. */
  night?: boolean;
  /** Islas flotantes en el cielo. */
  islands?: boolean;
}

export const HUB_ID = 'hub';

export const WORLD_THEMES: Record<string, WorldTheme> = {
  [HUB_ID]: {
    // Bosque tallado de noche: luna llena, bruma azul y el calor de velas y puertas.
    sky: { top: '#03050b', horizon: '#121a2e', bottom: '#05070e', sun: '#9fb0d8' },
    fog: 0.017,
    fogColor: '#0c1220',
    light: { hemiSky: '#3a4670', hemiGround: '#0a0806', sun: '#a9b8e6', sunIntensity: 0.22 },
    ground: '#7a5a42',
    night: true,
    // Pasto de noche (las briznas no reciben luz: colores ya oscurecidos).
    grass: { base: '#0e1a12', tips: ['#3a5c3c', '#466a44', '#33523a', '#527a4c', '#3e6448'] },
    trees: {
      style: 'forest',
      trunk: '#5a3b2c',
      canopy: ['#2f7a6a', '#3a8f74', '#4a9c86', '#2c6f73', '#5aa88a'],
      count: 150,
    },
    crystals: ['#f2b25c', '#e58a6a', '#f6d38a', '#d98fa0'],
    // Época navideña: nieve cayendo.
    particles: { style: 'snow', color: '#f4f7ff', count: 1600 },
    chord: [130.81, 196.0, 246.94, 329.63],
  },
  abundancia: {
    sky: { top: '#e0952a', horizon: '#ffdc98', bottom: '#d9a64a', sun: '#fff6d8' },
    fogColor: '#e6b360',
    fog: 0.009,
    light: { hemiSky: '#fff1c2', hemiGround: '#a8782a', sun: '#ffe2a0', sunIntensity: 2.4 },
    ground: '#8f6a22',
    grass: { base: '#6e4f14', tips: ['#f3d27a', '#e8bf55', '#f7e0a0', '#d9a840'] },
    trees: {
      style: 'round',
      trunk: '#6d4a23',
      canopy: ['#e3b04a', '#d99a32', '#efc463'],
      count: 60,
    },
    crystals: ['#f4b42c', '#ffd66b', '#c9a24c', '#ffe9a8'],
    particles: { style: 'sparkles', color: '#ffe08a', count: 500 },
    chord: [146.83, 220.0, 277.18, 369.99],
  },
  amor: {
    sky: { top: '#d9779a', horizon: '#f7c6cf', bottom: '#f3c1c6', sun: '#fff4f2' },
    fogColor: '#e59fb3',
    fog: 0.009,
    light: { hemiSky: '#ffe3ea', hemiGround: '#b77b86', sun: '#ffd7dc', sunIntensity: 2.0 },
    ground: '#b06878',
    grass: { base: '#94505f', tips: ['#f7c4d0', '#f2a9ba', '#fbd9df', '#e891a6'] },
    trees: {
      style: 'blossom',
      trunk: '#5b3a3d',
      canopy: ['#f6b9c9', '#f9cfd9', '#f09bb2'],
      count: 70,
    },
    crystals: ['#f7a6bb', '#ffc8d4', '#e58aa3', '#fbe1e7'],
    particles: { style: 'petals', color: '#ffc2d1', count: 650 },
    chord: [174.61, 220.0, 261.63, 329.63],
  },
  proteccion: {
    sky: { top: '#0d0a24', horizon: '#4d2d74', bottom: '#1a1236', sun: '#d9c8ff' },
    fogColor: '#3a2560',
    fog: 0.013,
    light: { hemiSky: '#8f7bd6', hemiGround: '#1a1430', sun: '#cdb8ff', sunIntensity: 1.1 },
    ground: '#1e1834',
    grass: { base: '#1a1430', tips: ['#6a50a8', '#8a6cc8', '#4f3a86', '#a68ae0'] },
    trees: {
      style: 'pine',
      trunk: '#2a2236',
      canopy: ['#2b2350', '#352a62', '#211b40'],
      count: 110,
    },
    crystals: ['#9d6be0', '#c39bff', '#6f45b8', '#2a2a34'],
    particles: { style: 'stars', color: '#d8c8ff', count: 500 },
    chord: [110.0, 164.81, 220.0, 261.63],
    night: true,
  },
  felicidad: {
    sky: { top: '#e5663a', horizon: '#ffca88', bottom: '#f2a35e', sun: '#fff1cf' },
    fogColor: '#ee9a5c',
    fog: 0.009,
    light: { hemiSky: '#ffd8a8', hemiGround: '#9a4f2f', sun: '#ffc27a', sunIntensity: 2.2 },
    ground: '#b8643f',
    grass: { base: '#9a4f2f', tips: ['#ffb067', '#f48a3c', '#ffd08a', '#e86a2f'] },
    trees: {
      style: 'round',
      trunk: '#5a3420',
      canopy: ['#f2a24a', '#e8843a', '#f7bd62'],
      count: 65,
    },
    crystals: ['#e0602f', '#f39a52', '#c9842e', '#ffc48a'],
    particles: { style: 'sparkles', color: '#ffc27a', count: 450 },
    chord: [196.0, 246.94, 293.66, 392.0],
  },
  suerte: {
    sky: { top: '#4a9fbf', horizon: '#d6ecc8', bottom: '#9cc7a0', sun: '#fffbe6' },
    fogColor: '#94c9a8',
    fog: 0.008,
    light: { hemiSky: '#e4f5ff', hemiGround: '#3d6b3a', sun: '#fff0c8', sunIntensity: 2.3 },
    ground: '#3f7d45',
    grass: { base: '#2f6a37', tips: ['#8fd07a', '#a8df8a', '#6cbf68', '#c4ea9a'] },
    trees: {
      style: 'round',
      trunk: '#4d3a22',
      canopy: ['#4fa860', '#3f9454', '#66bb72'],
      count: 70,
    },
    crystals: ['#c08a34', '#e2b45a', '#5fbf78', '#8a5a22'],
    particles: { style: 'sparkles', color: '#ffe38a', count: 420 },
    chord: [164.81, 207.65, 246.94, 329.63],
  },
  mixto: {
    sky: { top: '#231a52', horizon: '#f0a6c9', bottom: '#3a2d6a', sun: '#fff0fa' },
    fogColor: '#8a6fb0',
    fog: 0.008,
    light: { hemiSky: '#d9c6ff', hemiGround: '#2c2a52', sun: '#ffe2f2', sunIntensity: 1.6 },
    ground: '#2d3560',
    grass: {
      base: '#262c52',
      tips: ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#7c6cf2', '#e599f7'],
    },
    trees: {
      style: 'crystal',
      trunk: '#3b3355',
      canopy: ['#ff8fa3', '#ffd166', '#7bdcb5', '#8ecae6', '#b8a1ff'],
      count: 55,
    },
    crystals: ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#7c6cf2', '#e599f7'],
    particles: { style: 'sparkles', color: '#fff0fa', count: 550 },
    chord: [130.81, 164.81, 196.0, 246.94, 329.63],
    islands: true,
  },
  // Temporada: noche nevada de pinos.
  navidad: {
    sky: { top: '#0f1b33', horizon: '#3f5f80', bottom: '#1c2a44', sun: '#e8f0ff' },
    fogColor: '#46607e',
    fog: 0.016,
    light: { hemiSky: '#cfe0ff', hemiGround: '#2a3a52', sun: '#dfe8ff', sunIntensity: 1.4 },
    ground: '#dfe7ef',
    grass: { base: '#c6d2de', tips: ['#ffffff', '#eef4fa', '#dfe9f3'] },
    trees: {
      style: 'pine',
      trunk: '#3a2a22',
      canopy: ['#2f5a44', '#3a6a4f', '#264a3a'],
      count: 120,
    },
    crystals: ['#e04848', '#f2c14e', '#3f8f5a', '#ffffff'],
    particles: { style: 'petals', color: '#ffffff', count: 900 },
    chord: [146.83, 185.0, 220.0, 293.66],
    night: true,
  },
  // Temporada: noche de otoño, calabazas y luna naranja.
  halloween: {
    sky: { top: '#1a0f24', horizon: '#c0582a', bottom: '#2a1424', sun: '#ffb070' },
    fogColor: '#6a3326',
    fog: 0.017,
    light: { hemiSky: '#ffb88a', hemiGround: '#2a1820', sun: '#ff9a4a', sunIntensity: 1.6 },
    ground: '#3a2418',
    grass: { base: '#2a1a12', tips: ['#8a5a2a', '#a8642a', '#6a4a2a', '#c07a32'] },
    trees: {
      style: 'pine',
      trunk: '#2a1a14',
      canopy: ['#2a1a24', '#3a2230', '#1f1420'],
      count: 90,
    },
    crystals: ['#e8772e', '#f2a24a', '#7a3fa0', '#2a2a2a'],
    particles: { style: 'petals', color: '#d9772e', count: 500 },
    chord: [110.0, 130.81, 164.81, 207.65],
    night: true,
  },
  // Colección: noche lila de cristales gigantes.
  cuarzos: {
    sky: { top: '#140c2a', horizon: '#5a4a8a', bottom: '#1e1638', sun: '#efe6ff' },
    fogColor: '#3a2f5e',
    fog: 0.014,
    light: { hemiSky: '#c9b8ff', hemiGround: '#221a3a', sun: '#e6dcff', sunIntensity: 1.3 },
    ground: '#2c2448',
    grass: { base: '#1c1636', tips: ['#7a6ab0', '#9a8ad0', '#6a5aa0', '#b8a8e8'] },
    trees: {
      style: 'crystal',
      trunk: '#3b3355',
      canopy: ['#d8c8ff', '#f4c6d6', '#c7e6f5', '#fff1d6'],
      count: 70,
    },
    crystals: ['#d8c4ff', '#f4c6d6', '#c7e6f5', '#fff1d6'],
    particles: { style: 'snow', color: '#efe6ff', count: 700 },
    chord: [123.47, 155.56, 185.0, 246.94],
    night: true,
  },
  // Colección: pueblito andino al atardecer (ver toritos.ts).
  toritos: {
    sky: { top: '#6d9cd0', horizon: '#ffcf8f', bottom: '#c9965e', sun: '#ffb35c' },
    fogColor: '#f2c48c',
    fog: 0.0042,
    light: { hemiSky: '#a9c2ee', hemiGround: '#7a5228', sun: '#ffb36a', sunIntensity: 2.6 },
    ground: '#7e6234',
    grass: { base: '#4e3818', tips: ['#d9b864', '#c9a24a', '#e8cc80', '#b8903c'] },
    trees: { style: 'round', trunk: '#5a3a22', canopy: ['#6f8a3a'], count: 0 },
    crystals: ['#b8643f', '#e8c88a', '#8a3a2a', '#f2e4c4'],
    particles: { style: 'petals', color: '#f0d68a', count: 0 },
    chord: [146.83, 174.61, 220.0, 293.66],
  },
};

export function themeFor(worldId: string): WorldTheme {
  return WORLD_THEMES[worldId] ?? WORLD_THEMES[HUB_ID]!;
}
