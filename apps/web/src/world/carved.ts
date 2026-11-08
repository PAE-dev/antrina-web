import * as THREE from 'three';

/**
 * Materiales "tallados a mano" para el bosque de estilo stop-motion: el relieve (surcos de corteza,
 * vetas en espiral del suelo, huellas de arcilla, tablas de puerta) se calcula en el shader a partir
 * de la posición, así no hacen falta texturas ni fotos. Todo es propio: no usa imágenes de terceros.
 */
export type CarvePattern = 'bark' | 'rings' | 'clay' | 'planks';

export interface CarvedOptions {
  color: THREE.ColorRepresentation;
  pattern: CarvePattern;
  /** Fuerza del relieve. */
  depth?: number;
  /** Cuánto se oscurecen los surcos (0 = negro, 1 = nada). */
  groove?: number;
  /** Frecuencia del patrón. */
  frequency?: number;
  roughness?: number;
  /** Color emitido (cristales de arcilla que brillan un poco). */
  glow?: number;
  /** Centros para las vetas del suelo (x, z, radio). Máximo `MAX_RING_CENTERS`. */
  centers?: THREE.Vector3[];
}

export const MAX_RING_CENTERS = 48;

const NOISE = /* glsl */ `
  float carveHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float carveNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(carveHash(i), carveHash(i + vec2(1.0, 0.0)), u.x),
      mix(carveHash(i + vec2(0.0, 1.0)), carveHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float carveFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * carveNoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
  vec3 carvePerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
    vec3 sx = dFdx(surfPos);
    vec3 sy = dFdy(surfPos);
    vec3 r1 = cross(sy, surfNorm);
    vec3 r2 = cross(surfNorm, sx);
    float det = dot(sx, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * surfNorm - grad);
  }
`;

function heightFunction(pattern: CarvePattern): string {
  switch (pattern) {
    case 'bark':
      // Surcos verticales que ondulan, como corteza tallada con gubia.
      return /* glsl */ `
        float carveHeight() {
          float a = atan(vCarveLocal.z, vCarveLocal.x);
          float y = vCarveWorld.y;
          float warp = carveFbm(vec2(a * 2.0, y * 0.18)) * 3.0;
          float g = sin(a * uCarveFreq + warp + sin(y * 0.35 + a * 3.0) * 0.6);
          float ridge = 1.0 - abs(g);
          return smoothstep(0.0, 0.85, ridge) * 0.85 + carveNoise(vec2(a * 30.0, y * 3.0)) * 0.15;
        }
      `;
    case 'rings':
      // Vetas en espiral alrededor de cada tronco, sobre un remolino general del claro.
      return /* glsl */ `
        float carveHeight() {
          vec2 p = vCarveWorld.xz;
          float warp = carveFbm(p * 0.06) * 6.0;
          float dmin = 1e5;
          for (int i = 0; i < ${MAX_RING_CENTERS}; i++) {
            if (i >= uCarveCount) break;
            vec3 c = uCarveCenters[i];
            float d = max(length(p - c.xy) - c.z, 0.0);
            dmin = min(dmin, d);
          }
          float swirl = atan(p.y, p.x) * 1.5;
          float global = sin(length(p) * uCarveFreq * 0.55 + warp + swirl);
          float local = sin(dmin * uCarveFreq + warp * 0.6);
          float g = mix(global, local, exp(-dmin * 0.22));
          return smoothstep(-0.35, 0.9, 1.0 - abs(g)) * 0.9 + carveNoise(p * 6.0) * 0.1;
        }
      `;
    case 'planks':
      // Tablas verticales talladas (puertas).
      return /* glsl */ `
        float carveHeight() {
          vec2 p = vCarveLocal.xy;
          float warp = carveFbm(p * 1.6) * 1.4;
          float g = sin(p.x * uCarveFreq + warp + p.y * 0.4);
          return smoothstep(-0.2, 1.0, 1.0 - abs(g)) * 0.85 + carveNoise(p * 18.0) * 0.15;
        }
      `;
    default:
      // Arcilla: huellas suaves de dedos y pequeñas imperfecciones.
      return /* glsl */ `
        float carveHeight() {
          vec3 q = vCarveWorld * uCarveFreq;
          return carveFbm(q.xz + q.y * 0.7) * 0.7 + carveNoise(q.xy * 2.3 + q.z) * 0.3;
        }
      `;
  }
}

/** Material estándar con relieve tallado procedimental. Admite `InstancedMesh` con `instanceColor`. */
export function carvedMaterial(options: CarvedOptions): THREE.MeshStandardMaterial {
  const {
    color,
    pattern,
    depth = 1,
    groove = 0.55,
    frequency = pattern === 'bark' ? 38 : pattern === 'rings' ? 5 : pattern === 'planks' ? 22 : 3,
    roughness = 0.82,
    glow = 0,
    centers = [],
  } = options;
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const padded = Array.from(
    { length: MAX_RING_CENTERS },
    (_, i) => centers[i] ?? new THREE.Vector3(1e4, 1e4, 0),
  );
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCarveFreq = { value: frequency };
    shader.uniforms.uCarveDepth = { value: depth };
    shader.uniforms.uCarveGroove = { value: groove };
    shader.uniforms.uCarveGlow = { value: glow };
    shader.uniforms.uCarveCenters = { value: padded };
    shader.uniforms.uCarveCount = { value: Math.min(centers.length, MAX_RING_CENTERS) };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vCarveLocal;\nvarying vec3 vCarveWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vCarveLocal = position;
        vec4 carveW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          carveW = instanceMatrix * carveW;
        #endif
        vCarveWorld = (modelMatrix * carveW).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCarveLocal;
        varying vec3 vCarveWorld;
        uniform float uCarveFreq;
        uniform float uCarveDepth;
        uniform float uCarveGroove;
        uniform float uCarveGlow;
        uniform vec3 uCarveCenters[${MAX_RING_CENTERS}];
        uniform int uCarveCount;
        ${NOISE}
        ${heightFunction(pattern)}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float carveH = carveHeight();
        diffuseColor.rgb *= mix(uCarveGroove, 1.0, carveH);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 carveD = vec2(dFdx(carveH), dFdy(carveH)) * uCarveDepth;
        normal = carvePerturb(-vViewPosition, normal, carveD, faceDirection);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uCarveGlow;`,
      );
  };
  material.customProgramCacheKey = () => `carved-${pattern}-${centers.length > 0 ? 'c' : 'n'}`;
  return material;
}
