import { type LocaleCode, type ProductBadgeCode } from '@antrina/contracts';
import { type HeaderLabels, type Pillar, type Testimonial } from '@antrina/ui';

/**
 * Copys de la tienda. En títulos, `*palabras*` se muestra en color marca: úsalo en 1–2 palabras
 * clave y solo en títulos importantes. `label` es la etiqueta corta del índice de sección
 * ("01 — Intenciones"). Sin emojis ni descuentos.
 */
export interface Dictionary {
  meta: { title: string; description: string };
  announcement: string;
  shippingNote: string;
  header: HeaderLabels;
  nav: {
    intention: string;
    sign: string;
    size: string;
    createTree: string;
    meanings: string;
    corporate: string;
    story: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    text: string;
    primaryCta: string;
    secondaryCta: string;
    imageLabel: string;
    caption: string;
  };
  intentions: { label: string; title: string; intro: string };
  bestsellers: { label: string; title: string; viewAll: string };
  productPhoto: string;
  badges: Record<ProductBadgeCode, string>;
  story: { label: string; title: string; paragraphs: string[]; imageLabel: string; cta: string };
  zodiac: { label: string; title: string; intro: string };
  pillars: { label: string; title: string; items: Pillar[] };
  testimonials: { label: string; title: string; items: Testimonial[] };
  corporate: { label: string; title: string; text: string; imageLabel: string; cta: string };
  newsletter: {
    label: string;
    title: string;
    text: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    disclaimer: string;
  };
  footer: {
    slogan: string;
    tagline: string;
    shop: string;
    brand: string;
    help: string;
    shipping: string;
    contact: string;
    socialLabel: string;
    rights: string;
  };
}

const es: Dictionary = {
  meta: {
    title: 'Antrina · Árboles de cuarzo hechos a mano en Lima',
    description:
      'Bonsáis de cuarzo armados piedra por piedra en nuestro taller familiar de Lima. Elige tu intención o crea tu árbol. Envíos a todo el mundo.',
  },
  announcement: 'Hecho a mano en Lima, Perú · Envíos a todo el mundo',
  shippingNote: 'Envío gratis en Lima desde S/ 150',
  header: {
    search: 'Buscar',
    searchPlaceholder: 'Busca por piedra, intención o signo…',
    account: 'Mi cuenta',
    cart: 'Carrito',
    openMenu: 'Abrir menú',
    menuTitle: 'Menú',
    viewAll: 'Ver todo',
    home: 'Antrina, inicio',
    language: 'Idioma',
  },
  nav: {
    intention: 'Por intención',
    sign: 'Por signo',
    size: 'Tamaños',
    createTree: 'Crea tu árbol',
    meanings: 'Significados',
    corporate: 'Regalos corporativos',
    story: 'Nuestra historia',
  },
  hero: {
    eyebrow: 'Taller familiar en Lima, Perú',
    title: 'Arraigado en *tu intención*',
    text: 'Árboles de cuarzo armados piedra por piedra en nuestro taller familiar de Lima. Cada uno es único.',
    primaryCta: 'Elige tu intención',
    secondaryCta: 'Crea tu árbol',
    imageLabel: 'Foto de producto',
    caption: 'Amatista y cuarzo rosa · Pieza única',
  },
  intentions: {
    label: 'Intenciones',
    title: 'Elige *tu intención*',
    intro: 'Cada piedra acompaña un propósito. Elige el tuyo y lo armamos a mano, rama por rama.',
  },
  bestsellers: {
    label: 'Favoritos',
    title: 'Más vendidos',
    viewAll: 'Ver todos los árboles',
  },
  productPhoto: 'Foto de producto',
  badges: { NEW: 'Nuevo', CUSTOMIZABLE: 'Personalizable', LIMITED_EDITION: 'Edición limitada' },
  story: {
    label: 'Taller',
    title: 'Hecho a mano *en Lima*',
    paragraphs: [
      'Antrina nació en la mesa de nuestra casa, en Lima. Allí, en familia, elegimos cada piedra, enrollamos el alambre a mano y damos forma a cada rama, sin moldes ni prisas.',
      'Un árbol puede llevarnos más de un día de trabajo. Por eso no hay dos iguales: cada uno conserva el pulso de las manos que lo hicieron.',
    ],
    imageLabel: 'Foto: manos trabajando en el taller',
    cta: 'Conoce nuestra historia',
  },
  zodiac: {
    label: 'Signos',
    title: 'Encuentra *tu signo*',
    intro:
      'Cada signo tiene una piedra afín. Descubre la tuya y regálate un árbol que te represente.',
  },
  pillars: {
    label: 'Oficio',
    title: 'Lo que hay detrás de cada árbol',
    items: [
      {
        icon: 'hand',
        title: 'Hecho a mano',
        text: 'Sin moldes ni máquinas: alambre, piedra y paciencia, rama por rama en nuestro taller.',
      },
      {
        icon: 'stone',
        title: 'Piedras naturales',
        text: 'Cuarzos y piedras auténticas, elegidas una a una por su color y su energía.',
      },
      {
        icon: 'tree',
        title: 'Cada árbol es único',
        text: 'La forma de las piedras decide la del árbol. El tuyo no tendrá un gemelo.',
      },
    ],
  },
  /* Testimonios de muestra: reemplazar por reseñas reales (con permiso y foto del cliente). */
  testimonials: {
    label: 'Clientes',
    title: 'Lo que dicen quienes ya tienen el suyo',
    items: [
      {
        quote:
          'Se lo regalé a mi mamá por su cumpleaños y no deja de mirarlo. Se nota el cariño en cada rama.',
        author: 'Carla M.',
        place: 'Miraflores, Lima',
        product: 'Árbol de cuarzo rosa',
      },
      {
        quote:
          'Pedí uno de citrino para mi consultorio. Llegó impecable y con una tarjeta que explica la piedra.',
        author: 'Jorge R.',
        place: 'Arequipa',
        product: 'Árbol de citrino',
      },
      {
        quote:
          'Encargamos treinta mini árboles para nuestro equipo. Cumplieron los plazos y cada uno era distinto.',
        author: 'Daniela P.',
        place: 'Santiago de Chile',
        product: 'Regalo corporativo',
      },
    ],
  },
  corporate: {
    label: 'Empresas',
    title: 'Regalos *corporativos*',
    text: 'Árboles personalizados con la piedra y el mensaje de tu marca, para clientes, equipos y eventos. Cotizamos desde 10 unidades.',
    imageLabel: 'Foto de producto',
    cta: 'Solicitar cotización',
  },
  newsletter: {
    label: 'Carta mensual',
    title: 'Recibe el significado de *tu piedra del mes*',
    text: 'Una carta breve al mes: la piedra protagonista, su historia y cómo acompañarte con ella.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@correo.com',
    submit: 'Suscribirme',
    disclaimer: 'Puedes darte de baja cuando quieras.',
  },
  footer: {
    slogan: 'Arraigado en tu intención',
    tagline: 'Árboles de cuarzo hechos a mano en nuestro taller familiar de Lima, Perú.',
    shop: 'Tienda',
    brand: 'Antrina',
    help: 'Ayuda',
    shipping: 'Envíos',
    contact: 'Contacto',
    socialLabel: 'Redes sociales',
    rights: 'Todos los derechos reservados.',
  },
};

const en: Dictionary = {
  meta: {
    title: 'Antrina · Handmade quartz trees from Lima',
    description:
      'Quartz bonsai trees built stone by stone in our family workshop in Lima. Choose your intention or create your own tree. Worldwide shipping.',
  },
  announcement: 'Handmade in Lima, Peru · Worldwide shipping',
  shippingNote: 'Free shipping in Lima over S/ 150',
  header: {
    search: 'Search',
    searchPlaceholder: 'Search by stone, intention or sign…',
    account: 'My account',
    cart: 'Cart',
    openMenu: 'Open menu',
    menuTitle: 'Menu',
    viewAll: 'View all',
    home: 'Antrina, home',
    language: 'Language',
  },
  nav: {
    intention: 'By intention',
    sign: 'By sign',
    size: 'Sizes',
    createTree: 'Create your tree',
    meanings: 'Meanings',
    corporate: 'Corporate gifts',
    story: 'Our story',
  },
  hero: {
    eyebrow: 'Family workshop in Lima, Peru',
    title: 'Rooted in *intention*',
    text: 'Quartz trees built stone by stone in our family workshop in Lima. Each one is unique.',
    primaryCta: 'Choose your intention',
    secondaryCta: 'Create your tree',
    imageLabel: 'Product photo',
    caption: 'Amethyst and rose quartz · One of a kind',
  },
  intentions: {
    label: 'Intentions',
    title: 'Choose *your intention*',
    intro:
      'Every stone carries a purpose. Choose yours and we will build it by hand, branch by branch.',
  },
  bestsellers: {
    label: 'Favorites',
    title: 'Best sellers',
    viewAll: 'View all trees',
  },
  productPhoto: 'Product photo',
  badges: { NEW: 'New', CUSTOMIZABLE: 'Customizable', LIMITED_EDITION: 'Limited edition' },
  story: {
    label: 'Workshop',
    title: 'Handmade *in Lima*',
    paragraphs: [
      'Antrina was born at our kitchen table in Lima. There, as a family, we choose every stone, wrap the wire by hand and shape each branch, with no molds and no hurry.',
      'A single tree can take us more than a day of work. That is why no two are alike: each one keeps the rhythm of the hands that made it.',
    ],
    imageLabel: 'Photo: hands at work in the workshop',
    cta: 'Read our story',
  },
  zodiac: {
    label: 'Signs',
    title: 'Find *your sign*',
    intro:
      'Every sign has a kindred stone. Discover yours and gift yourself a tree that reflects you.',
  },
  pillars: {
    label: 'Craft',
    title: 'What lies behind every tree',
    items: [
      {
        icon: 'hand',
        title: 'Handmade',
        text: 'No molds, no machines: wire, stone and patience, branch by branch in our workshop.',
      },
      {
        icon: 'stone',
        title: 'Natural stones',
        text: 'Genuine quartz and gemstones, chosen one by one for their color and energy.',
      },
      {
        icon: 'tree',
        title: 'Every tree is unique',
        text: 'The shape of the stones decides the shape of the tree. Yours will have no twin.',
      },
    ],
  },
  testimonials: {
    label: 'Customers',
    title: 'From those who already have theirs',
    items: [
      {
        quote:
          'I gave it to my mother for her birthday and she can’t stop looking at it. You can feel the care in every branch.',
        author: 'Carla M.',
        place: 'Miraflores, Lima',
        product: 'Rose quartz tree',
      },
      {
        quote:
          'I ordered a citrine tree for my practice. It arrived flawless, with a card explaining the stone.',
        author: 'Jorge R.',
        place: 'Arequipa',
        product: 'Citrine tree',
      },
      {
        quote:
          'We ordered thirty mini trees for our team. They met every deadline and each one was different.',
        author: 'Daniela P.',
        place: 'Santiago, Chile',
        product: 'Corporate gift',
      },
    ],
  },
  corporate: {
    label: 'Companies',
    title: 'Corporate *gifts*',
    text: 'Custom trees with your brand’s stone and message, for clients, teams and events. Quotes from 10 units.',
    imageLabel: 'Product photo',
    cta: 'Request a quote',
  },
  newsletter: {
    label: 'Monthly letter',
    title: 'Receive the meaning of *your stone of the month*',
    text: 'A short letter each month: the featured stone, its story and how to live with it.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@email.com',
    submit: 'Subscribe',
    disclaimer: 'You can unsubscribe at any time.',
  },
  footer: {
    slogan: 'Rooted in intention',
    tagline: 'Quartz trees handmade in our family workshop in Lima, Peru.',
    shop: 'Shop',
    brand: 'Antrina',
    help: 'Help',
    shipping: 'Shipping',
    contact: 'Contact',
    socialLabel: 'Social media',
    rights: 'All rights reserved.',
  },
};

const DICTIONARIES: Record<LocaleCode, Dictionary> = { es, en };

export function getDictionary(locale: LocaleCode): Dictionary {
  return DICTIONARIES[locale];
}
