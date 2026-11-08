/**
 * Catálogo de piedras de Antrina (panel, tienda y "Tu cielo" usan estos ids). El significado largo
 * de cada una vive en la tienda (`apps/web/src/content/stones.ts` y `@antrina/sky`).
 */
export interface StoneCatalogEntry {
  id: string;
  name: { es: string; en: string };
}

export const PRODUCT_STONES: readonly StoneCatalogEntry[] = [
  { id: 'cuarzo-cristal', name: { es: 'Cuarzo cristal', en: 'Clear quartz' } },
  { id: 'cuarzo-rosa', name: { es: 'Cuarzo rosado', en: 'Rose quartz' } },
  { id: 'amatista', name: { es: 'Amatista', en: 'Amethyst' } },
  { id: 'citrino', name: { es: 'Citrino', en: 'Citrine' } },
  { id: 'pirita', name: { es: 'Pirita', en: 'Pyrite' } },
  { id: 'jade', name: { es: 'Jade', en: 'Jade' } },
  { id: 'onix-negro', name: { es: 'Ónix negro', en: 'Black onyx' } },
  { id: 'jaspe-rojo', name: { es: 'Jaspe rojo', en: 'Red jasper' } },
  { id: 'agata-de-fuego', name: { es: 'Ágata de fuego', en: 'Fire agate' } },
  { id: 'agata-fucsia', name: { es: 'Ágata fucsia', en: 'Fuchsia agate' } },
  { id: 'crisocola', name: { es: 'Crisocola', en: 'Chrysocolla' } },
  { id: 'serpentina', name: { es: 'Serpentina', en: 'Serpentine' } },
  { id: 'sodalita', name: { es: 'Sodalita', en: 'Sodalite' } },
  { id: 'angelita', name: { es: 'Angelita', en: 'Angelite' } },
  { id: 'rodonita', name: { es: 'Rodonita', en: 'Rhodonite' } },
  { id: 'turmalina-negra', name: { es: 'Turmalina negra', en: 'Black tourmaline' } },
  { id: 'cornalina', name: { es: 'Cornalina', en: 'Carnelian' } },
  { id: 'ojo-de-tigre', name: { es: 'Ojo de tigre', en: "Tiger's eye" } },
  { id: 'piedra-luna', name: { es: 'Piedra luna', en: 'Moonstone' } },
  { id: 'amazonita', name: { es: 'Amazonita', en: 'Amazonite' } },
  { id: 'lapislazuli', name: { es: 'Lapislázuli', en: 'Lapis lazuli' } },
  { id: 'obsidiana', name: { es: 'Obsidiana', en: 'Obsidian' } },
  { id: 'turquesa', name: { es: 'Turquesa', en: 'Turquoise' } },
  { id: 'aguamarina', name: { es: 'Aguamarina', en: 'Aquamarine' } },
];

export const stoneName = (id: string, locale: 'es' | 'en'): string =>
  PRODUCT_STONES.find((stone) => stone.id === id)?.name[locale] ?? id;
