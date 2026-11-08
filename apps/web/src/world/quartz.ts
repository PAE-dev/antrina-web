import * as THREE from 'three';

/**
 * Cuarzo con forma real: prisma hexagonal con punta piramidal (seis caras, como los cristales de
 * roca) y material de vidrio que refleja y deja pasar la luz. Sustituye a los octaedros.
 */

let geometry: THREE.BufferGeometry | null = null;

/** Prisma de 1 de radio y ~3.1 de alto (base en y = 0). Caras planas. */
export function quartzGeometry(): THREE.BufferGeometry {
  if (geometry) return geometry;
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.9, 0),
    new THREE.Vector2(1, 0.18),
    new THREE.Vector2(1, 2.15),
    new THREE.Vector2(0.06, 3.05),
    new THREE.Vector2(0, 3.08),
  ];
  const lathe = new THREE.LatheGeometry(profile, 6, Math.PI / 6);
  geometry = lathe.toNonIndexed();
  lathe.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

const materials = new Map<string, THREE.MeshPhysicalMaterial>();

export function quartzMaterial(hex: string): THREE.MeshPhysicalMaterial {
  const cached = materials.get(hex);
  if (cached) return cached;
  const color = new THREE.Color(hex);
  // Cristal claro: deja ver lo que hay detrás, con un tinte suave y destellos irisados en las caras.
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.02,
    metalness: 0,
    transmission: 1,
    thickness: 0.35,
    ior: 1.55,
    attenuationColor: color,
    attenuationDistance: 2.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    iridescence: 0.55,
    iridescenceIOR: 1.4,
    emissive: color,
    emissiveIntensity: 0.06,
    envMapIntensity: 1.6,
    flatShading: true,
  });
  materials.set(hex, material);
  return material;
}

/** Racimo de puntas de cuarzo que salen del suelo, inclinadas hacia fuera. */
export function quartzCluster(
  colors: string[],
  count: number,
  size: number,
  rng: () => number,
): THREE.Group {
  const group = new THREE.Group();
  const geo = quartzGeometry();
  for (let i = 0; i < count; i++) {
    const hex = colors[Math.floor(rng() * colors.length)] ?? '#f1e3ff';
    const crystal = new THREE.Mesh(geo, quartzMaterial(hex));
    const main = i === 0;
    const s = size * (main ? 1 : 0.45 + rng() * 0.45);
    const a = rng() * Math.PI * 2;
    const r = main ? 0 : size * (0.15 + rng() * 0.35);
    crystal.position.set(Math.cos(a) * r, -0.05 * s, Math.sin(a) * r);
    crystal.scale.set(s * 0.22, s * 0.36, s * 0.22);
    // Inclinación hacia fuera del centro del racimo.
    const tilt = main ? rng() * 0.15 : 0.35 + rng() * 0.45;
    crystal.rotation.set(Math.sin(a) * tilt, rng() * Math.PI, -Math.cos(a) * tilt);
    crystal.castShadow = true;
    group.add(crystal);
  }
  return group;
}
