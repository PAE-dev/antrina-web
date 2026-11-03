import { worldById } from '../bosque/forest-world';

export const FOREST_PATH = '/mundos';
const COLLECTION_SEGMENT = 'coleccion';
const SHOP_SEGMENT = 'tienda';
const PROFILE_SEGMENT = 'perfil';

/** Cada mundo tiene dos pantallas: su interior y lo que has reunido en él. */
export type WorldTab = 'main' | 'collection';

export type AppRoute =
  | { view: 'forest' }
  | { view: 'shop' }
  | { view: 'profile' }
  | { view: 'world'; id: string; tab: WorldTab };

/** `/mundos`, `/mundos/<mundo>` o `/mundos/<mundo>/coleccion`. Lo demás no existe. */
export function parseAppPath(pathname: string): AppRoute | null {
  const [root, id, segment, ...rest] = pathname.split('/').filter(Boolean);
  if (root !== FOREST_PATH.slice(1) || rest.length > 0) return null;
  if (!id) return { view: 'forest' };
  if (!segment && id === SHOP_SEGMENT) return { view: 'shop' };
  if (!segment && id === PROFILE_SEGMENT) return { view: 'profile' };
  const world = worldById(id);
  if (!world?.target) return null;
  if (segment && segment !== COLLECTION_SEGMENT) return null;
  return { view: 'world', id, tab: segment ? 'collection' : 'main' };
}

export function appPath(route: AppRoute): string {
  if (route.view === 'forest') return FOREST_PATH;
  if (route.view === 'shop') return `${FOREST_PATH}/${SHOP_SEGMENT}`;
  if (route.view === 'profile') return `${FOREST_PATH}/${PROFILE_SEGMENT}`;
  const base = `${FOREST_PATH}/${route.id}`;
  return route.tab === 'collection' ? `${base}/${COLLECTION_SEGMENT}` : base;
}
