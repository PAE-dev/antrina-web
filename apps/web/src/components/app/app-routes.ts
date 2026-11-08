import { worldById } from '../bosque/forest-world';

export const FOREST_PATH = '/mundos';
const COLLECTION_SEGMENT = 'coleccion';
const SHOP_SEGMENT = 'tienda';
const PROFILE_SEGMENT = 'perfil';

/** Las pantallas de un mundo: su interior, lo que has reunido en él y lo que vende. */
export type WorldTab = 'main' | 'collection' | 'shop';

export type AppRoute =
  { view: 'forest' } | { view: 'profile' } | { view: 'world'; id: string; tab: WorldTab };

/**
 * `/mundos`, `/mundos/perfil`, `/mundos/<mundo>`, `/mundos/<mundo>/coleccion` y
 * `/mundos/<mundo>/tienda`. Un mundo aún sin interior puede tener ya su tienda. Lo demás no existe.
 */
export function parseAppPath(pathname: string): AppRoute | null {
  const [root, id, segment, ...rest] = pathname.split('/').filter(Boolean);
  if (root !== FOREST_PATH.slice(1) || rest.length > 0) return null;
  if (!id) return { view: 'forest' };
  if (!segment && id === PROFILE_SEGMENT) return { view: 'profile' };
  const world = worldById(id);
  if (!world) return null;
  if (segment === SHOP_SEGMENT) return world.shop ? { view: 'world', id, tab: 'shop' } : null;
  if (!world.target) return null;
  if (segment && segment !== COLLECTION_SEGMENT) return null;
  return { view: 'world', id, tab: segment ? 'collection' : 'main' };
}

export function appPath(route: AppRoute): string {
  if (route.view === 'forest') return FOREST_PATH;
  if (route.view === 'profile') return `${FOREST_PATH}/${PROFILE_SEGMENT}`;
  const base = `${FOREST_PATH}/${route.id}`;
  if (route.tab === 'shop') return `${base}/${SHOP_SEGMENT}`;
  return route.tab === 'collection' ? `${base}/${COLLECTION_SEGMENT}` : base;
}
