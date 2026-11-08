import { type Localized } from '../i18n/taxonomy';

/**
 * Puertas extra del bosque 3D de la portada (temporada y colecciones), además de una por intención. Llevan a la
 * categoría con ese slug: créala en el panel (Categorías) para que la puerta tenga destino.
 * El `id` elige la forma de la puerta y el mundo que hay detrás (`world/grove.ts`, `world/worlds.ts`).
 */
export interface SeasonalDoor {
  id: string;
  slug: Localized<string>;
  copy: Localized<{ label: string; caption: string; text: string }>;
}

export const SEASONAL_DOORS: SeasonalDoor[] = [
  {
    id: 'navidad',
    slug: { es: 'navidad', en: 'christmas' },
    copy: {
      es: {
        label: 'Navidad',
        caption: 'Colección de temporada',
        text: 'Árboles y piezas para regalar y decorar la casa en Navidad.',
      },
      en: {
        label: 'Christmas',
        caption: 'Seasonal collection',
        text: 'Trees and pieces to give and to decorate your home for Christmas.',
      },
    },
  },
  {
    id: 'halloween',
    slug: { es: 'halloween', en: 'halloween' },
    copy: {
      es: {
        label: 'Halloween',
        caption: 'Colección de temporada',
        text: 'Piezas de otoño y noches de calabaza, hechas a mano en nuestro taller.',
      },
      en: {
        label: 'Halloween',
        caption: 'Seasonal collection',
        text: 'Autumn pieces for pumpkin nights, handmade in our workshop.',
      },
    },
  },
  {
    id: 'cuarzos',
    slug: { es: 'cuarzos', en: 'quartz' },
    copy: {
      es: {
        label: 'Cuarzos',
        caption: 'Tu signo y tus cuarzos',
        text: 'Puntas, drusas y piedras de cuarzo elegidas una por una en nuestro taller.',
      },
      en: {
        label: 'Quartz',
        caption: 'Your sign and your stones',
        text: 'Quartz points, clusters and stones hand-picked one by one in our workshop.',
      },
    },
  },
  {
    id: 'toritos',
    slug: { es: 'toritos', en: 'toritos' },
    copy: {
      es: {
        label: 'Toritos',
        caption: 'Toritos de Pucará',
        text: 'Toritos de cerámica andina, protectores del hogar y de la buena fortuna.',
      },
      en: {
        label: 'Toritos',
        caption: 'Pucará bulls',
        text: 'Andean ceramic bulls that guard the home and bring good fortune.',
      },
    },
  },
];
