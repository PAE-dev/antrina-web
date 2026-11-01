import { loadToritoAssets, TORITO_VIEW, ToritoRenderer } from './torito-renderer';
import { type ToritoColor } from './toritos';

const WIDTH = 186;
const HEIGHT = 208;
const STILL_TEMPERAMENT = { blinkEvery: 1, liveliness: 0, earEvery: 1 };
const thumbnails = new Map<string, Promise<string>>();

/** Foto fija del torito en cada color, para la galería: animarlos a todos no cabe en un celular. */
export function toritoThumbnail(assetsPath: string, color: ToritoColor): Promise<string> {
  let thumbnail = thumbnails.get(color.id);
  if (!thumbnail) {
    thumbnail = loadToritoAssets(assetsPath).then((assets) => {
      const renderer = new ToritoRenderer(
        document.createElement('canvas'),
        document.createElement('canvas'),
        assets,
        STILL_TEMPERAMENT,
        true,
        { sprite: true, view: TORITO_VIEW, color: color.rgb },
      );
      const image = renderer.snapshot(WIDTH, HEIGHT);
      renderer.destroy();
      renderer.release();
      return image;
    });
    thumbnails.set(color.id, thumbnail);
  }
  return thumbnail;
}
