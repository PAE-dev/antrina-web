import { type PublicImageDto } from '@antrina/contracts';
import { type ImageSource } from '@antrina/ui';

/** Deben coincidir con `imagesConfig.sizes` en `astro.config.mjs`. */
export const IMAGE_WIDTHS = [384, 640, 828, 1080, 1600, 2048] as const;

/** Solo en Vercel existe el optimizador `/_vercel/image`; en local se sirve el original. */
const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const OPTIMIZE = import.meta.env.VERCEL === '1' || runtimeEnv?.VERCEL === '1';

export const SIZES = {
  card: '(min-width: 1024px) 25vw, 50vw',
  half: '(min-width: 1024px) 42vw, 100vw',
  gallery: '(min-width: 1024px) 55vw, 100vw',
} as const;

function optimized(url: string, width: number): string {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

export function responsive(url: string, sizes: string, maxWidth = 2048) {
  if (!OPTIMIZE) return { src: url };
  const widths = IMAGE_WIDTHS.filter((width) => width <= maxWidth);
  return {
    src: optimized(url, widths.at(-2) ?? widths[0] ?? 828),
    srcSet: widths.map((width) => `${optimized(url, width)} ${width}w`).join(', '),
    sizes,
  };
}

export function toImageSource(
  image: PublicImageDto | undefined,
  sizes: string,
  fallbackAlt: string,
) {
  if (!image) return undefined;
  const source: ImageSource = {
    ...responsive(image.url, sizes, image.width),
    alt: image.alt || fallbackAlt,
    width: image.width,
    height: image.height,
  };
  return source;
}

export const cardImage = (url: string) => responsive(url, SIZES.card, 1080);
