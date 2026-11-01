/**
 * Anima la ilustración plana deformándola en WebGL, sin redibujarla. Todas las coordenadas están en
 * píxeles de la imagen original (1122 × 1402). Las zonas (ojos, cabeza, orejas…) son provisionales
 * hasta tener el arte separado en capas.
 */
export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uImage;
uniform sampler2D uMask; // R = torito, G = torito ampliado, B = campo suave
uniform sampler2D uFill; // lo que queda detrás del torito
uniform float uTime;
uniform float uAmbient;
uniform float uBlink;
uniform float uHead;
uniform float uNod;
uniform float uEarLeft;
uniform float uEarRight;
uniform float uBreath;
uniform float uPulse;
uniform vec2 uLook;
// Nacimiento
uniform float uHide;
uniform float uDusk;
uniform float uGlow;
uniform float uRise;
uniform float uScale;
uniform float uPaint;
// Figura recortada sobre otra escena
uniform float uSprite;
uniform vec4 uView;
uniform vec3 uBody;
uniform float uRecolor;

const vec2 SIZE = vec2(1122.0, 1402.0);
const vec2 EYE_LEFT = vec2(753.0, 348.0);
const vec2 EYE_RIGHT = vec2(913.0, 365.0);
const vec2 FEET = vec2(540.0, 1105.0);
const vec2 BODY_FLOWER = vec2(595.0, 632.0);

float ellipse(vec2 p, vec2 c, vec2 r, float inner) {
  return 1.0 - smoothstep(inner, 1.0, length((p - c) / r));
}

vec2 rotateAround(vec2 p, vec2 pivot, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  vec2 d = p - pivot;
  return pivot + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 7.0) + 0.15 * noise(p * 4.3 + 13.0);
}

/** Una planta que se mece desde su base. */
vec2 sway(vec2 p, vec2 pivot, vec2 center, vec2 radius, float amount, float speed, float phase) {
  float angle = amount * (sin(uTime * speed + phase) + 0.35 * sin(uTime * speed * 2.3 + phase));
  return (rotateAround(p, pivot, angle) - p) * ellipse(p, center, radius, 0.45);
}

/** Brisa: hojas, borlas, flores y nubes. El torito queda fuera. */
vec2 ambientOffset(vec2 p) {
  float t = uTime;
  vec2 d = vec2(0.0);

  float leaves = max(ellipse(p, vec2(530.0, 105.0), vec2(400.0, 175.0), 0.45),
    max(ellipse(p, vec2(770.0, 15.0), vec2(130.0, 60.0), 0.4),
        ellipse(p, vec2(50.0, 430.0), vec2(80.0, 105.0), 0.4)));
  float gust = 0.6 + 0.4 * sin(t * 0.37);
  d += leaves * gust * vec2(
    2.8 * sin(t * 1.25 + p.x * 0.021 + p.y * 0.013) + 1.2 * sin(t * 2.4 + p.y * 0.05),
    2.0 * sin(t * 1.05 + p.x * 0.03));

  d += sway(p, vec2(245.0, 85.0), vec2(245.0, 190.0), vec2(56.0, 112.0), 0.032, 1.1, 0.0);
  d += sway(p, vec2(186.0, 205.0), vec2(190.0, 285.0), vec2(42.0, 72.0), 0.05, 1.3, 1.1);
  d += sway(p, vec2(140.0, 235.0), vec2(155.0, 290.0), vec2(42.0, 62.0), 0.055, 1.2, 2.3);

  d += sway(p, vec2(30.0, 1090.0), vec2(65.0, 930.0), vec2(100.0, 125.0), 0.018, 0.9, 0.5);
  d += sway(p, vec2(70.0, 1400.0), vec2(110.0, 1215.0), vec2(125.0, 145.0), 0.014, 0.8, 1.7);
  d += sway(p, vec2(330.0, 1400.0), vec2(345.0, 1240.0), vec2(115.0, 105.0), 0.016, 1.0, 2.9);
  d += sway(p, vec2(1060.0, 1160.0), vec2(1050.0, 1060.0), vec2(95.0, 75.0), 0.024, 1.15, 4.0);
  d += sway(p, vec2(20.0, 1130.0), vec2(22.0, 1085.0), vec2(45.0, 40.0), 0.03, 1.2, 3.1);

  float clouds = max(ellipse(p, vec2(930.0, 130.0), vec2(290.0, 170.0), 0.5),
                     ellipse(p, vec2(1040.0, 370.0), vec2(110.0, 90.0), 0.4));
  d.x += clouds * 3.5 * sin(t * 0.22 + p.y * 0.012);

  return d * uAmbient;
}

/** Respiración, cabeza y orejas. Devuelve de qué punto de la imagen sale cada píxel. */
vec2 toritoWarp(vec2 s, float weight) {
  vec2 q = s;

  float body = weight * smoothstep(1110.0, 820.0, s.y);
  q.y += uBreath * 2.6 * body;
  q.x += (s.x - 520.0) * -uBreath * 0.0035 * body;

  float head = weight * (1.0 - smoothstep(265.0, 395.0, length(s - vec2(790.0, 330.0))));
  q = rotateAround(q, vec2(725.0, 520.0), -uHead * head);
  q.y += uNod * head;

  q = rotateAround(q, vec2(665.0, 372.0), -uEarLeft * ellipse(q, vec2(610.0, 368.0), vec2(80.0, 66.0), 0.6));
  q = rotateAround(q, vec2(940.0, 430.0), -uEarRight * ellipse(q, vec2(960.0, 420.0), vec2(38.0, 50.0), 0.6));

  vec2 forehead = vec2(835.0, 292.0);
  q = forehead + (q - forehead) / (1.0 + uPulse * 0.08 * ellipse(q, forehead, vec2(58.0, 52.0), 0.55));
  q = BODY_FLOWER + (q - BODY_FLOWER) / (1.0 + uPulse * 0.035 * ellipse(q, BODY_FLOWER, vec2(125.0, 120.0), 0.6));
  return q;
}

/**
 * Cambia solo la arcilla roja del cuerpo. Las líneas crema, las flores, las hojas y la guirnalda
 * tienen otro tono o menos saturación, así que conservan su color.
 */
vec3 recolor(vec3 color, float amount, float hueEdge) {
  if (uRecolor < 0.5 || amount <= 0.0) return color;
  float high = max(color.r, max(color.g, color.b));
  float low = min(color.r, min(color.g, color.b));
  float saturation = (high - low) / (high + 0.001);
  float hue = (color.g - color.b) / (high - low + 0.001);
  float isWarm = step(color.b, color.g + 0.03) * step(color.g, color.r);
  float clay = isWarm * (1.0 - smoothstep(hueEdge, hueEdge + 0.14, hue)) * smoothstep(0.3, 0.48, saturation);
  float light = dot(color, vec3(0.3, 0.59, 0.11));
  vec3 body = uBody * clamp(light / 0.4, 0.4, 1.5) + max(light - 0.5, 0.0) * 0.4;
  return mix(color, body, clay * amount);
}

/** Párpados dibujados sobre el ojo, con el color de la piel de justo encima. */
vec3 eyelid(vec3 color, vec2 q, vec2 eye, vec2 radius) {
  if (uBlink <= 0.001) return color;
  vec2 d = (q - eye) / radius;
  float inside = 1.0 - smoothstep(0.94, 1.04, length(d));
  if (inside <= 0.0) return color;
  float meet = 0.3 + 0.32 * d.x * d.x;
  float top = mix(-1.15, meet, uBlink);
  float bottom = mix(1.25, meet + 0.02, uBlink);
  float covered = max(1.0 - smoothstep(top - 0.05, top + 0.05, d.y), smoothstep(bottom - 0.05, bottom + 0.05, d.y));
  vec2 skinAt = vec2(eye.x + d.x * radius.x * 0.8, eye.y - radius.y * 1.4 + d.y * 4.0);
  vec3 skin = recolor(texture2D(uImage, skinAt / SIZE).rgb, 1.0, 0.5) * (0.97 - 0.09 * smoothstep(-1.0, 0.5, d.y));
  vec3 result = mix(color, skin, covered);
  float line = (1.0 - smoothstep(0.0, 0.1, abs(d.y - top))) * smoothstep(0.02, 0.25, uBlink);
  return mix(color, mix(result, vec3(0.24, 0.1, 0.05), line * 0.9), inside);
}

vec3 toritoColor(vec2 q) {
  float pupilLeft = ellipse(q, EYE_LEFT, vec2(36.0, 35.0), 0.25);
  float pupilRight = ellipse(q, EYE_RIGHT, vec2(22.0, 26.0), 0.25);
  vec2 source = q - uLook * (pupilLeft * 5.5 + pupilRight * 3.2);
  vec3 color = texture2D(uImage, source / SIZE).rgb;
  // Solo el iris se libra: el borde del ojo es de la misma arcilla.
  float outsideIris = (1.0 - ellipse(q, EYE_LEFT, vec2(29.0, 28.0), 0.8))
    * (1.0 - ellipse(q, EYE_RIGHT, vec2(17.0, 21.0), 0.8));
  // El hocico es más anaranjado que el cuerpo; la guirnalda dorada debe quedar como está.
  float hueEdge = mix(0.36, 0.62, ellipse(q, vec2(872.0, 428.0), vec2(88.0, 66.0), 0.6));
  color = recolor(color, texture2D(uMask, q / SIZE).r * outsideIris, hueEdge);
  color = eyelid(color, q, EYE_LEFT, vec2(37.0, 36.0));
  color = eyelid(color, q, EYE_RIGHT, vec2(23.0, 27.0));
  return color;
}

/** Atardecer, horno y torito que crece de la arcilla y se va pintando. */
vec3 birthColor(vec2 p, vec2 ambient) {
  vec3 mask = texture2D(uMask, p / SIZE).rgb;
  vec3 background = texture2D(uImage, (p + ambient * (1.0 - mask.g)) / SIZE).rgb;
  background = mix(background, texture2D(uFill, p / SIZE).rgb, mask.g);

  float lum = dot(background, vec3(0.3, 0.59, 0.11));
  vec3 dusk = mix(vec3(lum), background, 0.55) * vec3(0.3, 0.33, 0.55);
  background = mix(background, dusk, uDusk);
  // Niebla sobre el hueco del torito: el relleno de detrás no tiene detalle.
  float mist = 0.45 + 0.75 * fbm(p * 0.007 + vec2(uTime * 0.03, uTime * -0.012));
  float mistArea = ellipse(p, vec2(540.0, 680.0), vec2(620.0, 640.0), 0.35);
  background = mix(background, vec3(0.13, 0.13, 0.25) * mist, uDusk * mistArea * 0.88);
  float kiln = exp(-length((p - vec2(540.0, 1040.0)) / vec2(480.0, 300.0)));
  background += uGlow * kiln * vec3(0.55, 0.24, 0.08) * (0.9 + 0.1 * sin(uTime * 3.0));

  vec2 s = FEET + (p - FEET) / uScale;
  vec3 spriteMask = texture2D(uMask, s / SIZE).rgb;
  float edge = mix(1150.0, 40.0, uRise) + (fbm(s * 0.012) - 0.5) * 140.0;
  float alpha = spriteMask.r * smoothstep(edge - 14.0, edge + 14.0, s.y);
  if (alpha <= 0.001) return background;

  vec2 q = toritoWarp(s, smoothstep(0.02, 0.55, spriteMask.b));
  vec3 art = toritoColor(q);
  float light = dot(art, vec3(0.3, 0.59, 0.11));
  vec3 clay = mix(vec3(0.24, 0.12, 0.07), vec3(0.8, 0.5, 0.33), smoothstep(0.08, 0.85, light));

  float distance = length(s - BODY_FLOWER) / 820.0 + (fbm(s * 0.02) - 0.5) * 0.12;
  float front = uPaint * 1.3 - 0.1;
  float painted = 1.0 - smoothstep(front - 0.03, front + 0.03, distance);
  vec3 color = mix(clay, art, painted);
  float brush = exp(-pow((distance - front) / 0.018, 2.0)) * step(0.001, uPaint) * (1.0 - step(0.999, uPaint));
  color += brush * vec3(0.75, 0.5, 0.26);

  return mix(background, color, alpha);
}

void main() {
  vec2 p = uView.xy + vUv * uView.zw;
  float weight = smoothstep(0.02, 0.55, texture2D(uMask, p / SIZE).b);
  if (uSprite > 0.5) {
    vec2 q = toritoWarp(p, weight);
    float alpha = texture2D(uMask, q / SIZE).r;
    gl_FragColor = vec4(toritoColor(q) * alpha, alpha);
    return;
  }
  vec2 ambient = ambientOffset(p);

  vec3 color = vec3(0.0);
  if (uHide < 0.999) {
    color = toritoColor(toritoWarp(p, weight) + ambient * (1.0 - weight));
  }
  if (uHide > 0.001) {
    color = mix(color, birthColor(p, ambient), uHide);
  }
  gl_FragColor = vec4(color, 1.0);
}
`;
