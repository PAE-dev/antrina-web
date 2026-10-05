import { type LocaleCode } from '@antrina/contracts';

/**
 * Copys de las páginas internas (catálogo, colecciones, ficha, piedras, búsqueda, 404).
 * `metaTitle` va sin la marca: el layout añade " · Antrina". En títulos, `*palabras*` = color marca.
 */
export interface PageCopy {
  home: string;
  breadcrumb: string;
  faq: string;
  catalog: {
    label: string;
    title: string;
    intro: string;
    metaTitle: string;
    metaDescription: string;
    count: (n: number) => string;
    empty: string;
    browseBy: string;
  };
  intentionIndex: { label: string; title: string; intro: string; metaDescription: string };
  signIndex: { label: string; title: string; intro: string; metaDescription: string };
  sizeIndex: { label: string; title: string; intro: string; metaDescription: string };
  intention: {
    metaDescription: (label: string, stones: string) => string;
    stonesLabel: string;
    readMeaning: string;
  };
  sign: {
    title: (sign: string) => string;
    intro: (sign: string, dates: string, stone: string) => string;
    metaTitle: (sign: string, stone: string) => string;
    metaDescription: (sign: string, stone: string) => string;
    stoneLabel: string;
  };
  size: {
    title: (size: string) => string;
    metaTitle: (size: string) => string;
    metaDescription: (size: string, text: string) => string;
  };
  collection: { empty: string; emptyCta: string; others: string };
  product: {
    order: string;
    orderNote: string;
    contact: string;
    whatsappMessage: (name: string, url: string) => string;
    inStock: string;
    outOfStock: string;
    details: string;
    intention: string;
    size: string;
    signs: string;
    stones: string;
    origin: string;
    sku: string;
    uniqueTitle: string;
    uniqueText: string;
    shippingTitle: string;
    shippingText: string;
    careTitle: string;
    careText: string;
    related: string;
    photo: (n: number, total: number) => string;
    unavailableTitle: string;
    unavailableText: string;
    metaDescription: (name: string, intention: string) => string;
  };
  stones: {
    label: string;
    title: string;
    intro: string;
    metaTitle: string;
    metaDescription: string;
    color: string;
    chakra: string;
    signs: string;
    intention: string;
    care: string;
    meaningOf: (stone: string) => string;
    metaTitleOf: (stone: string) => string;
    treesWith: (stone: string) => string;
    all: string;
    disclaimer: string;
  };
  search: {
    title: string;
    label: string;
    placeholder: string;
    submit: string;
    results: (n: number, query: string) => string;
    empty: (query: string) => string;
    hint: string;
  };
  notFound: { label: string; title: string; text: string; cta: string };
  comingSoon: {
    cart: { title: string; text: string };
    account: { title: string; text: string };
    newsletter: { title: string; text: string };
    cta: string;
  };
}

const es: PageCopy = {
  home: 'Inicio',
  breadcrumb: 'Ruta de navegación',
  faq: 'Preguntas frecuentes',
  catalog: {
    label: 'Catálogo',
    title: 'Árboles de cuarzo *hechos a mano*',
    intro:
      'Todos nuestros bonsáis de cuarzo, armados piedra por piedra en nuestro taller familiar de Lima. Elige por intención, por signo o por tamaño: cada árbol es una pieza única.',
    metaTitle: 'Árboles de cuarzo y bonsáis de piedras naturales hechos a mano',
    metaDescription:
      'Compra árboles de cuarzo hechos a mano en Lima: cuarzo rosa, amatista, citrino, turmalina y siete chakras. Piezas únicas con envío a todo el Perú y el mundo.',
    count: (n) => (n === 1 ? '1 árbol' : `${n} árboles`),
    empty: 'Pronto habrá nuevos árboles aquí.',
    browseBy: 'Explorar por',
  },
  intentionIndex: {
    label: 'Intenciones',
    title: 'Árboles de cuarzo *por intención*',
    intro:
      'Cada piedra acompaña un propósito: abundancia, amor, protección, felicidad o el equilibrio de los siete chakras. Elige la intención y te mostramos los árboles que la llevan.',
    metaDescription:
      'Árboles de cuarzo por intención: abundancia (citrino), amor (cuarzo rosa), protección (turmalina negra y amatista), felicidad y siete chakras. Hechos a mano en Lima.',
  },
  signIndex: {
    label: 'Signos',
    title: 'Árboles de cuarzo *por signo*',
    intro:
      'Cada signo del zodiaco tiene una piedra afín. Busca el tuyo, o el de la persona a quien quieres regalar, y descubre los árboles que llevan su piedra.',
    metaDescription:
      'Encuentra la piedra de tu signo zodiacal y el árbol de cuarzo que la lleva: de Aries a Piscis. Regalos con significado hechos a mano en Lima.',
  },
  sizeIndex: {
    label: 'Tamaños',
    title: 'Árboles de cuarzo *por tamaño*',
    intro:
      'Desde árboles mini para un escritorio hasta piezas de Edición Firma sobre piedra en bruto. Elige el tamaño según el lugar donde vivirá tu árbol.',
    metaDescription:
      'Árboles de cuarzo en tamaño mini, estándar, grande y Edición Firma. Elige el ideal para tu escritorio, sala u oficina. Hechos a mano en Lima.',
  },
  intention: {
    metaDescription: (label, stones) =>
      `Árboles de cuarzo para ${label.toLowerCase()} con ${stones.replace(' · ', ' y ').toLowerCase()}, armados a mano en nuestro taller de Lima. Piezas únicas con envío a todo el mundo.`,
    stonesLabel: 'Piedras de esta intención',
    readMeaning: 'Leer su significado',
  },
  sign: {
    title: (sign) => `Árboles de cuarzo para *${sign}*`,
    intro: (sign, dates, stone) =>
      `Las personas de ${sign} (${dates}) tienen como piedra afín la ${stone.toLowerCase()}. Estos son los árboles que la llevan, hechos a mano en nuestro taller de Lima: un regalo con significado para cumpleaños y fechas especiales.`,
    metaTitle: (sign, stone) => `Árbol de cuarzo para ${sign}: ${stone.toLowerCase()}`,
    metaDescription: (sign, stone) =>
      `La piedra de ${sign} es la ${stone.toLowerCase()}. Descubre los árboles de cuarzo hechos a mano que la llevan: el regalo ideal para ${sign}.`,
    stoneLabel: 'Piedra afín',
  },
  size: {
    title: (size) => `Árboles de cuarzo *${size.toLowerCase()}*`,
    metaTitle: (size) => `Árboles de cuarzo ${size.toLowerCase()} hechos a mano`,
    metaDescription: (size, text) => `Árboles de cuarzo tamaño ${size.toLowerCase()}. ${text}`,
  },
  collection: {
    empty:
      'Estamos armando nuevos árboles para esta colección. Mientras tanto, podemos hacerte uno a pedido.',
    emptyCta: 'Crea tu árbol',
    others: 'Ver otras',
  },
  product: {
    order: 'Pedir por WhatsApp',
    orderNote: 'Te respondemos en horario de taller para coordinar el pago y el envío.',
    contact: 'Escríbenos para pedirlo',
    whatsappMessage: (name, url) => `Hola, me interesa el ${name}: ${url}`,
    inStock: 'Disponible',
    outOfStock: 'Agotado · podemos hacerte uno similar',
    details: 'Detalles',
    intention: 'Intención',
    size: 'Tamaño',
    signs: 'Signos',
    stones: 'Piedras',
    origin: 'Origen',
    sku: 'Código',
    uniqueTitle: 'Una pieza única',
    uniqueText:
      'Cada árbol se arma a mano y la forma de las piedras decide la de las ramas: el tuyo será muy parecido al de las fotos, pero no idéntico.',
    shippingTitle: 'Envío',
    shippingText:
      'Enviamos a todo el Perú y al extranjero, bien embalado para que llegue intacto. Envío gratis en Lima desde S/ 150.',
    careTitle: 'Cuidados',
    careText:
      'Quítale el polvo con un pincel suave o una brocha de maquillaje. Evita el agua y el sol directo durante horas para conservar el color de las piedras.',
    related: 'También te puede gustar',
    photo: (n, total) => `Foto ${n} de ${total}`,
    unavailableTitle: 'No pudimos cargar este árbol',
    unavailableText: 'Vuelve a intentarlo en unos segundos.',
    metaDescription: (name, intention) =>
      `${name}: árbol de cuarzo hecho a mano en Lima${intention ? `, para ${intention.toLowerCase()}` : ''}. Pieza única con piedras naturales. Envíos a todo el Perú y el mundo.`,
  },
  stones: {
    label: 'Significados',
    title: 'Significado de *las piedras*',
    intro:
      'Qué representa cada piedra de nuestros árboles, con qué intención y signo se relaciona y cómo cuidarla. Una guía breve para elegir con sentido.',
    metaTitle: 'Significado de las piedras y cuarzos',
    metaDescription:
      'Significado del cuarzo rosa, la amatista, el citrino, la turmalina negra y más piedras naturales: intención, signo, chakra y cuidados.',
    color: 'Color',
    chakra: 'Chakra',
    signs: 'Signo',
    intention: 'Intención',
    care: 'Cómo cuidarla',
    meaningOf: (stone) => `${stone}: *significado*`,
    metaTitleOf: (stone) => `${stone}: significado, signo y cuidados`,
    treesWith: (stone) => `Árboles con ${stone.toLowerCase()}`,
    all: 'Todas las piedras',
    disclaimer:
      'Los significados recogen tradiciones y creencias populares sobre las piedras. No sustituyen el consejo de un profesional de la salud.',
  },
  search: {
    title: 'Buscar',
    label: 'Buscar en la tienda',
    placeholder: 'Piedra, intención o signo…',
    submit: 'Buscar',
    results: (n, query) => `${n === 1 ? '1 resultado' : `${n} resultados`} para “${query}”`,
    empty: (query) => `No encontramos árboles para “${query}”.`,
    hint: 'Prueba con una piedra (amatista, cuarzo rosa), una intención (amor, protección) o un signo.',
  },
  notFound: {
    label: 'Error 404',
    title: 'Esta página *no existe*',
    text: 'Puede que el enlace haya cambiado o que el árbol ya no esté disponible.',
    cta: 'Ver todos los árboles',
  },
  comingSoon: {
    cart: {
      title: 'Carrito',
      text: 'Muy pronto podrás comprar aquí directamente. Mientras tanto, pide tu árbol por WhatsApp desde su ficha.',
    },
    account: {
      title: 'Mi cuenta',
      text: 'Las cuentas de cliente llegarán pronto. Por ahora no necesitas registrarte para pedir tu árbol.',
    },
    newsletter: {
      title: 'Carta mensual',
      text: 'Estamos preparando la primera carta. Muy pronto podrás suscribirte desde aquí.',
    },
    cta: 'Ver los árboles',
  },
};

const en: PageCopy = {
  home: 'Home',
  breadcrumb: 'Breadcrumb',
  faq: 'Frequently asked questions',
  catalog: {
    label: 'Catalog',
    title: 'Handmade *quartz trees*',
    intro:
      'All our quartz bonsai trees, built stone by stone in our family workshop in Lima. Browse by intention, sign or size: every tree is one of a kind.',
    metaTitle: 'Handmade quartz trees and natural gemstone bonsai',
    metaDescription:
      'Shop handmade quartz trees from Lima, Peru: rose quartz, amethyst, citrine, black tourmaline and seven chakra trees. One-of-a-kind pieces, shipped worldwide.',
    count: (n) => (n === 1 ? '1 tree' : `${n} trees`),
    empty: 'New trees are coming soon.',
    browseBy: 'Browse by',
  },
  intentionIndex: {
    label: 'Intentions',
    title: 'Quartz trees *by intention*',
    intro:
      'Every stone carries a purpose: abundance, love, protection, happiness or the balance of the seven chakras. Choose an intention and see the trees that carry it.',
    metaDescription:
      'Quartz trees by intention: abundance (citrine), love (rose quartz), protection (black tourmaline and amethyst), happiness and seven chakras. Handmade in Lima.',
  },
  signIndex: {
    label: 'Signs',
    title: 'Quartz trees *by sign*',
    intro:
      'Every zodiac sign has a kindred stone. Find yours, or the sign of someone you want to surprise, and discover the trees that carry it.',
    metaDescription:
      'Find your zodiac birthstone and the quartz tree that carries it, from Aries to Pisces. Meaningful handmade gifts from Lima, Peru.',
  },
  sizeIndex: {
    label: 'Sizes',
    title: 'Quartz trees *by size*',
    intro:
      'From mini trees for a desk to Signature Edition pieces on raw stone. Choose the size that suits the place your tree will live.',
    metaDescription:
      'Quartz trees in mini, standard, large and Signature Edition sizes. Find the right one for your desk, living room or office. Handmade in Lima.',
  },
  intention: {
    metaDescription: (label, stones) =>
      `Quartz trees for ${label.toLowerCase()} with ${stones.replace(' · ', ' and ').toLowerCase()}, handmade in our Lima workshop. One-of-a-kind pieces shipped worldwide.`,
    stonesLabel: 'Stones for this intention',
    readMeaning: 'Read its meaning',
  },
  sign: {
    title: (sign) => `Quartz trees for *${sign}*`,
    intro: (sign, dates, stone) =>
      `${sign} (${dates}) has ${stone.toLowerCase()} as its kindred stone. These are the trees that carry it, handmade in our Lima workshop: a meaningful gift for birthdays and special dates.`,
    metaTitle: (sign, stone) => `Quartz tree for ${sign}: ${stone.toLowerCase()}`,
    metaDescription: (sign, stone) =>
      `${stone} is the stone of ${sign}. Discover the handmade quartz trees that carry it: the perfect gift for ${sign}.`,
    stoneLabel: 'Kindred stone',
  },
  size: {
    title: (size) => `*${size}* quartz trees`,
    metaTitle: (size) => `${size} handmade quartz trees`,
    metaDescription: (size, text) => `${size} quartz trees. ${text}`,
  },
  collection: {
    empty:
      'We are building new trees for this collection. In the meantime, we can make one to order.',
    emptyCta: 'Create your tree',
    others: 'See other',
  },
  product: {
    order: 'Order on WhatsApp',
    orderNote: 'We reply during workshop hours to arrange payment and shipping.',
    contact: 'Write to us to order',
    whatsappMessage: (name, url) => `Hi, I’m interested in the ${name}: ${url}`,
    inStock: 'Available',
    outOfStock: 'Sold out · we can make you a similar one',
    details: 'Details',
    intention: 'Intention',
    size: 'Size',
    signs: 'Signs',
    stones: 'Stones',
    origin: 'Origin',
    sku: 'Code',
    uniqueTitle: 'One of a kind',
    uniqueText:
      'Every tree is built by hand and the shape of the stones decides the shape of the branches: yours will look very much like the photos, but never identical.',
    shippingTitle: 'Shipping',
    shippingText:
      'We ship across Peru and worldwide, carefully packed so it arrives intact. Free shipping in Lima over S/ 150.',
    careTitle: 'Care',
    careText:
      'Dust it with a soft brush or a makeup brush. Avoid water and hours of direct sunlight to keep the stones’ color.',
    related: 'You may also like',
    photo: (n, total) => `Photo ${n} of ${total}`,
    unavailableTitle: 'We couldn’t load this tree',
    unavailableText: 'Please try again in a few seconds.',
    metaDescription: (name, intention) =>
      `${name}: a quartz tree handmade in Lima, Peru${intention ? `, for ${intention.toLowerCase()}` : ''}. One of a kind, with natural stones. Shipped worldwide.`,
  },
  stones: {
    label: 'Meanings',
    title: 'Meaning of *the stones*',
    intro:
      'What each stone in our trees stands for, which intention and sign it relates to and how to care for it. A short guide to choose with meaning.',
    metaTitle: 'Crystal and gemstone meanings',
    metaDescription:
      'The meaning of rose quartz, amethyst, citrine, black tourmaline and more natural stones: intention, zodiac sign, chakra and care.',
    color: 'Color',
    chakra: 'Chakra',
    signs: 'Sign',
    intention: 'Intention',
    care: 'How to care for it',
    meaningOf: (stone) => `*${stone}* meaning`,
    metaTitleOf: (stone) => `${stone}: meaning, zodiac sign and care`,
    treesWith: (stone) => `Trees with ${stone.toLowerCase()}`,
    all: 'All stones',
    disclaimer:
      'These meanings reflect traditions and popular beliefs about stones. They are not a substitute for advice from a health professional.',
  },
  search: {
    title: 'Search',
    label: 'Search the shop',
    placeholder: 'Stone, intention or sign…',
    submit: 'Search',
    results: (n, query) => `${n === 1 ? '1 result' : `${n} results`} for “${query}”`,
    empty: (query) => `We couldn’t find trees for “${query}”.`,
    hint: 'Try a stone (amethyst, rose quartz), an intention (love, protection) or a sign.',
  },
  notFound: {
    label: 'Error 404',
    title: 'This page *doesn’t exist*',
    text: 'The link may have changed, or the tree may no longer be available.',
    cta: 'See all trees',
  },
  comingSoon: {
    cart: {
      title: 'Cart',
      text: 'Soon you’ll be able to buy here directly. In the meantime, order your tree on WhatsApp from its page.',
    },
    account: {
      title: 'My account',
      text: 'Customer accounts are coming soon. For now you don’t need to sign up to order your tree.',
    },
    newsletter: {
      title: 'Monthly letter',
      text: 'We are preparing our first letter. Soon you’ll be able to subscribe here.',
    },
    cta: 'See the trees',
  },
};

const COPY: Record<LocaleCode, PageCopy> = { es, en };

export const getPageCopy = (locale: LocaleCode): PageCopy => COPY[locale];
