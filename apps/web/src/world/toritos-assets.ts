import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Modelos reales del mundo de los Toritos (todos CC0, ver `public/world/toritos/CREDITS.txt`):
 * toro, llama y alpaca de Quaternius, casas de teja de Poly Pizza, cerámica y rueca de Poly Haven,
 * y el cielo/paisaje HDRI "Qwantani Late Afternoon" (puna dorada al atardecer).
 */

const BASE = '/world/toritos';

export interface ToritosAssets {
  bull: GLTF;
  llama: GLTF;
  alpaca: GLTF;
  houses: GLTF[];
  props: Record<string, GLTF>;
  hdr: THREE.DataTexture;
  sky: THREE.Texture;
}

let assets: ToritosAssets | null = null;
let loading: Promise<ToritosAssets | null> | null = null;

export function toritosAssets(): ToritosAssets | null {
  return assets;
}

/** Carga (una sola vez) los modelos y el HDRI. Si algo falla, el mundo usa sus figuras propias. */
export function preloadToritosAssets(): Promise<ToritosAssets | null> {
  if (loading) return loading;
  const gltf = new GLTFLoader();
  gltf.setMeshoptDecoder(MeshoptDecoder);
  const glb = (name: string) => gltf.loadAsync(`${BASE}/${name}.glb`);
  const propNames = [
    'ceramic_vase_02',
    'jug_01',
    'planter_pot_clay',
    'wicker_basket_01',
    'spinning_wheel_01',
  ];
  loading = Promise.all([
    glb('bull'),
    glb('llama'),
    glb('alpaca'),
    glb('house_a'),
    glb('house_b'),
    Promise.all(propNames.map(glb)),
    new HDRLoader().loadAsync(`${BASE}/sky_1k.hdr`),
    new THREE.TextureLoader().loadAsync(`${BASE}/sky_4k.jpg`),
  ])
    .then(([bull, llama, alpaca, houseA, houseB, props, hdr, sky]) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      sky.mapping = THREE.EquirectangularReflectionMapping;
      sky.colorSpace = THREE.SRGBColorSpace;
      sky.anisotropy = 4;
      assets = {
        bull,
        llama,
        alpaca,
        houses: [houseA, houseB],
        props: Object.fromEntries(propNames.map((name, i) => [name, props[i]!])),
        hdr,
        sky,
      };
      return assets;
    })
    .catch(() => null);
  return loading;
}

/* ------------------------------------------------------------------ utilidades */

/**
 * Copia de un modelo, apoyada en el suelo (y = 0), centrada y escalada para que su lado más
 * largo en planta mida `length` (o su alto mida `height`).
 */
export function placeModel(
  source: THREE.Object3D,
  size: { length?: number; height?: number },
  skinned = false,
): THREE.Group {
  const copy = skinned ? SkeletonUtils.clone(source) : source.clone(true);
  copy.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(copy, true);
  const dims = box.getSize(new THREE.Vector3());
  const scale = size.height
    ? size.height / Math.max(dims.y, 1e-6)
    : (size.length ?? 1) / Math.max(dims.x, dims.z, 1e-6);
  const center = box.getCenter(new THREE.Vector3());
  copy.position.set(-center.x, -box.min.y, -center.z);
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  inner.add(copy);
  holder.add(inner);
  holder.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    }
  });
  return holder;
}

/** Medidas de un objeto ya colocado (en coordenadas de su padre). */
export function boundsOf(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object, true);
}

/**
 * Pinta un modelo como cerámica esmaltada: las zonas oscuras del modelo pasan a `dark`
 * (terracota) y las claras a `light` (crema), con brillo de esmalte.
 */
export function glaze(object: THREE.Object3D, dark: string, light: string): void {
  const darkColor = new THREE.Color(dark);
  const lightColor = new THREE.Color(light);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const old = mesh.material as THREE.MeshStandardMaterial;
    const material = new THREE.MeshPhysicalMaterial({
      map: old.map ?? null,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uGlazeDark = { value: darkColor };
      shader.uniforms.uGlazeLight = { value: lightColor };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uGlazeDark;\nuniform vec3 uGlazeLight;',
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          float glazeL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(uGlazeDark, uGlazeLight, smoothstep(0.22, 0.5, glazeL));`,
        );
    };
    material.customProgramCacheKey = () => `glaze-${dark}-${light}`;
    mesh.material = material;
  });
}

/** Clip de animación cuyo nombre contenga alguna de las palabras (en orden de preferencia). */
export function findClip(gltf: GLTF, words: string[]): THREE.AnimationClip | undefined {
  for (const word of words) {
    const clip = gltf.animations.find((a) => a.name.toLowerCase().includes(word));
    if (clip) return clip;
  }
  return gltf.animations[0];
}
