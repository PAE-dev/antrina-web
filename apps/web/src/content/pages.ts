import { type LocaleCode } from '@antrina/contracts';

/**
 * Páginas de contenido largo. Plazos, precios de envío y condiciones de cambio son un borrador:
 * revisarlos con el taller antes de anunciarlos en Google Merchant Center.
 */
export type ContentPageId = 'story' | 'shipping' | 'contact' | 'corporate' | 'createTree';

export type ContentAction = 'order' | 'catalog' | 'intentions' | 'meanings' | 'contact';

export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

export interface ContentPage {
  label: string;
  /** H1; `*palabras*` en color marca. */
  title: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  sections: ContentSection[];
  faq?: Array<{ question: string; answer: string }>;
  /** Llamada a la acción del final; `order` abre WhatsApp con `message`. */
  cta: { title: string; label: string; action: ContentAction; message?: string };
}

const es: Record<ContentPageId, ContentPage> = {
  story: {
    label: 'Nuestra historia',
    title: 'Un taller familiar *en Lima*',
    intro:
      'Antrina nació en la mesa de nuestra casa. Hoy seguimos ahí: eligiendo piedras, enrollando alambre y dando forma a cada árbol con las manos.',
    metaTitle: 'Nuestra historia: árboles de cuarzo hechos a mano en Lima',
    metaDescription:
      'Conoce el taller familiar detrás de Antrina: árboles bonsái de cuarzo y piedras naturales hechos a mano en Lima, Perú, sin moldes ni prisas.',
    sections: [
      {
        heading: 'Cómo empezó',
        paragraphs: [
          'Todo empezó con un árbol de amatista que hicimos para regalar. Gustó tanto que nos pidieron otro, y luego otro. Con el tiempo, la mesa de la casa se convirtió en un pequeño taller familiar.',
          'El nombre Antrina viene de esa idea de echar raíces: cada árbol está pensado para acompañar una intención —amor, abundancia, protección, alegría— y quedarse contigo mucho tiempo.',
        ],
      },
      {
        heading: 'Cómo hacemos cada árbol',
        paragraphs: [
          'Elegimos las piedras una a una por su color y su forma. Después enrollamos el alambre a mano, rama por rama, y montamos el árbol sobre una base natural.',
          'No usamos moldes ni máquinas. Un árbol grande puede llevarnos más de un día de trabajo, y por eso no hay dos iguales: el tuyo será muy parecido al de las fotos, pero único.',
        ],
      },
      {
        heading: 'Lo que nos importa',
        paragraphs: [
          'Trabajamos con piedras naturales y materiales que duran. Embalamos cada pedido con cuidado para que llegue intacto, en Lima, en el resto del Perú o al otro lado del mundo.',
          'Y si buscas algo especial —una piedra concreta, un tamaño, un mensaje— lo hacemos contigo.',
        ],
      },
    ],
    cta: { title: 'Elige tu árbol', label: 'Ver todos los árboles', action: 'catalog' },
  },
  shipping: {
    label: 'Envíos y cambios',
    title: 'Envíos a todo el Perú *y al mundo*',
    intro:
      'Cada árbol se embala a mano para que llegue intacto. Aquí tienes los plazos y condiciones de envío, cambios y devoluciones.',
    metaTitle: 'Envíos, cambios y devoluciones',
    metaDescription:
      'Envíos de árboles de cuarzo a todo el Perú y al extranjero. Envío gratis en Lima desde S/ 150. Plazos, embalaje, cambios y devoluciones.',
    sections: [
      {
        heading: 'Lima Metropolitana',
        paragraphs: [
          'Entregamos en 1 a 3 días hábiles. El envío es gratis en pedidos desde S/ 150; por debajo de ese monto, el costo depende del distrito y te lo confirmamos antes de pagar.',
        ],
      },
      {
        heading: 'Resto del Perú',
        paragraphs: [
          'Enviamos por agencia o courier a todas las regiones en 3 a 7 días hábiles. Te compartimos el código de seguimiento en cuanto sale el paquete.',
        ],
      },
      {
        heading: 'Envíos internacionales',
        paragraphs: [
          'Enviamos a todo el mundo por courier internacional. El plazo habitual es de 7 a 15 días hábiles según el destino. Los impuestos o aranceles del país de destino corren por cuenta de quien recibe.',
        ],
      },
      {
        heading: 'Piezas hechas a pedido',
        paragraphs: [
          'Los árboles personalizados se elaboran después de confirmar el pedido. Te indicaremos el tiempo de taller (normalmente de 5 a 10 días hábiles) antes de que pagues.',
        ],
      },
      {
        heading: 'Cambios y devoluciones',
        paragraphs: [
          'Si tu árbol llega dañado, escríbenos dentro de las 48 horas siguientes a la entrega con fotos del paquete y del árbol, y lo reparamos o lo reponemos sin costo.',
          'Los árboles del catálogo se pueden cambiar dentro de los 7 días posteriores a la entrega si están en el mismo estado en que los recibiste. Las piezas personalizadas no admiten cambio, salvo daño en el envío.',
        ],
      },
    ],
    faq: [
      {
        question: '¿Cuánto cuesta el envío en Lima?',
        answer:
          'Es gratis en pedidos desde S/ 150. Para montos menores, el costo depende del distrito y te lo confirmamos antes de pagar.',
      },
      {
        question: '¿Hacen envíos fuera del Perú?',
        answer:
          'Sí, enviamos a todo el mundo por courier internacional, con un plazo habitual de 7 a 15 días hábiles.',
      },
      {
        question: '¿Qué pasa si mi árbol llega dañado?',
        answer:
          'Escríbenos dentro de las 48 horas siguientes a la entrega con fotos y lo reparamos o lo reponemos sin costo.',
      },
    ],
    cta: {
      title: '¿Tienes una duda sobre tu envío?',
      label: 'Escríbenos',
      action: 'order',
      message: 'Hola, tengo una consulta sobre un envío.',
    },
  },
  contact: {
    label: 'Contacto',
    title: 'Hablemos de *tu árbol*',
    intro:
      'Escríbenos para pedir un árbol, consultar un envío o crear una pieza a tu medida. Respondemos en horario de taller, de lunes a sábado.',
    metaTitle: 'Contacto',
    metaDescription:
      'Contacta con el taller de Antrina en Lima para pedir un árbol de cuarzo, consultar envíos o encargar una pieza personalizada.',
    sections: [
      {
        heading: 'Pedidos y consultas',
        paragraphs: [
          'La forma más rápida es WhatsApp: cuéntanos qué árbol te gusta o qué intención buscas y te ayudamos a elegir, coordinamos el pago y el envío.',
        ],
      },
      {
        heading: 'Taller',
        paragraphs: [
          'Somos un taller familiar en Lima, Perú. Por ahora no tenemos tienda física: atendemos en línea y enviamos a todo el país y al extranjero.',
        ],
      },
    ],
    cta: {
      title: 'Escríbenos',
      label: 'Escribir por WhatsApp',
      action: 'order',
      message: 'Hola, quisiera hacer una consulta.',
    },
  },
  corporate: {
    label: 'Regalos corporativos',
    title: 'Regalos corporativos *con intención*',
    intro:
      'Árboles de cuarzo personalizados para clientes, equipos y eventos: un regalo hecho a mano que se queda en el escritorio durante años. Cotizamos desde 10 unidades.',
    metaTitle: 'Regalos corporativos personalizados hechos a mano',
    metaDescription:
      'Regalos corporativos únicos: árboles de cuarzo hechos a mano en Lima, personalizados con la piedra, el tamaño y el mensaje de tu marca. Desde 10 unidades.',
    sections: [
      {
        heading: 'Para quién',
        paragraphs: [
          'Regalos de fin de año, bienvenida de nuevos colaboradores, aniversarios, clientes clave, eventos y premiaciones. Cada árbol puede llevar una intención distinta según el mensaje que quieras transmitir.',
        ],
      },
      {
        heading: 'Qué personalizamos',
        paragraphs: [
          'La piedra o combinación de piedras (por ejemplo, citrino para la prosperidad o amatista para la calma), el tamaño, la base y una tarjeta con tu mensaje y tu marca.',
        ],
      },
      {
        heading: 'Cómo trabajamos',
        paragraphs: [
          'Nos cuentas la ocasión, la cantidad y la fecha. Te enviamos una propuesta con fotos de referencia y precio por unidad. Tras tu aprobación, hacemos una muestra y luego producimos el pedido completo.',
          'Para pedidos grandes recomendamos escribirnos con al menos 3 a 4 semanas de anticipación. Emitimos factura.',
        ],
      },
    ],
    faq: [
      {
        question: '¿Cuál es el pedido mínimo?',
        answer: 'Cotizamos desde 10 unidades.',
      },
      {
        question: '¿Con cuánta anticipación debo pedir?',
        answer:
          'Para pedidos grandes recomendamos de 3 a 4 semanas. Si tienes una fecha cercana, escríbenos y vemos qué es posible.',
      },
      {
        question: '¿Emiten factura?',
        answer: 'Sí, emitimos factura para empresas.',
      },
    ],
    cta: {
      title: 'Pide tu cotización',
      label: 'Solicitar cotización',
      action: 'order',
      message: 'Hola, quisiera cotizar regalos corporativos.',
    },
  },
  createTree: {
    label: 'Crea tu árbol',
    title: 'Crea *tu árbol*',
    intro:
      'Elige la intención, las piedras y el tamaño, y lo armamos a mano para ti. Una pieza única pensada desde el principio para quien la recibe.',
    metaTitle: 'Crea tu árbol de cuarzo personalizado',
    metaDescription:
      'Diseña tu árbol de cuarzo personalizado: elige intención, piedras y tamaño. Hecho a mano en nuestro taller de Lima y enviado a todo el Perú y el mundo.',
    sections: [
      {
        heading: '1. Elige la intención',
        paragraphs: [
          'Amor, abundancia, protección, alegría o una mezcla. La intención nos guía para proponerte las piedras que mejor la acompañan.',
        ],
      },
      {
        heading: '2. Elige las piedras',
        paragraphs: [
          'Puedes partir de tu piedra favorita, de la piedra de tu signo o de la de la persona a quien se lo regalas. Te ayudamos a combinarlas por color.',
        ],
      },
      {
        heading: '3. Elige el tamaño',
        paragraphs: [
          'Desde un mini para el escritorio hasta una pieza de firma que se convierte en el centro de la sala. Te enviamos fotos de referencia y el precio antes de empezar.',
        ],
      },
      {
        heading: '4. Lo hacemos a mano',
        paragraphs: [
          'Con tu aprobación, armamos el árbol en el taller (normalmente de 5 a 10 días hábiles) y te enviamos una foto antes de despacharlo.',
        ],
      },
    ],
    cta: {
      title: 'Empecemos tu árbol',
      label: 'Diseñar por WhatsApp',
      action: 'order',
      message: 'Hola, quisiera crear un árbol personalizado.',
    },
  },
};

const en: Record<ContentPageId, ContentPage> = {
  story: {
    label: 'Our story',
    title: 'A family workshop *in Lima*',
    intro:
      'Antrina was born at our kitchen table. We are still there: choosing stones, wrapping wire and shaping every tree by hand.',
    metaTitle: 'Our story: handmade quartz trees from Lima',
    metaDescription:
      'Meet the family workshop behind Antrina: quartz and natural stone bonsai trees handmade in Lima, Peru, with no molds and no hurry.',
    sections: [
      {
        heading: 'How it started',
        paragraphs: [
          'It all began with an amethyst tree we made as a gift. People loved it so much they asked for another, and then another. Over time, our kitchen table became a small family workshop.',
          'The name Antrina comes from the idea of putting down roots: every tree is meant to hold an intention —love, abundance, protection, joy— and stay with you for a long time.',
        ],
      },
      {
        heading: 'How we make each tree',
        paragraphs: [
          'We choose the stones one by one for their color and shape. Then we wrap the wire by hand, branch by branch, and mount the tree on a natural base.',
          'No molds, no machines. A large tree can take us more than a day of work, which is why no two are alike: yours will look very much like the photos, but it will be one of a kind.',
        ],
      },
      {
        heading: 'What we care about',
        paragraphs: [
          'We work with natural stones and long-lasting materials. Every order is packed with care so it arrives intact, in Lima, anywhere in Peru or across the world.',
          'And if you are looking for something special —a particular stone, a size, a message— we will make it with you.',
        ],
      },
    ],
    cta: { title: 'Choose your tree', label: 'See all trees', action: 'catalog' },
  },
  shipping: {
    label: 'Shipping & returns',
    title: 'Shipping across Peru *and worldwide*',
    intro:
      'Every tree is packed by hand so it arrives intact. Here are our delivery times and our shipping, exchange and return conditions.',
    metaTitle: 'Shipping, exchanges and returns',
    metaDescription:
      'Quartz trees shipped across Peru and worldwide. Free shipping in Lima over S/ 150. Delivery times, packaging, exchanges and returns.',
    sections: [
      {
        heading: 'Lima',
        paragraphs: [
          'Delivery in 1 to 3 business days. Shipping is free on orders over S/ 150; below that amount, the cost depends on the district and we confirm it before you pay.',
        ],
      },
      {
        heading: 'Rest of Peru',
        paragraphs: [
          'We ship by agency or courier to every region in 3 to 7 business days, and share the tracking code as soon as the parcel leaves.',
        ],
      },
      {
        heading: 'International shipping',
        paragraphs: [
          'We ship worldwide by international courier. Delivery usually takes 7 to 15 business days depending on the destination. Import duties or taxes are paid by the recipient.',
        ],
      },
      {
        heading: 'Made-to-order pieces',
        paragraphs: [
          'Custom trees are made after the order is confirmed. We will tell you the workshop time (usually 5 to 10 business days) before you pay.',
        ],
      },
      {
        heading: 'Exchanges and returns',
        paragraphs: [
          'If your tree arrives damaged, write to us within 48 hours of delivery with photos of the parcel and the tree, and we will repair or replace it at no cost.',
          'Catalog trees can be exchanged within 7 days of delivery if they are in the same condition you received them. Custom pieces cannot be exchanged unless damaged in transit.',
        ],
      },
    ],
    faq: [
      {
        question: 'How much is shipping in Lima?',
        answer:
          'It is free on orders over S/ 150. For smaller orders, the cost depends on the district and we confirm it before you pay.',
      },
      {
        question: 'Do you ship outside Peru?',
        answer:
          'Yes, we ship worldwide by international courier, usually within 7 to 15 business days.',
      },
      {
        question: 'What if my tree arrives damaged?',
        answer:
          'Write to us within 48 hours of delivery with photos and we will repair or replace it at no cost.',
      },
    ],
    cta: {
      title: 'A question about your shipment?',
      label: 'Write to us',
      action: 'order',
      message: 'Hi, I have a question about shipping.',
    },
  },
  contact: {
    label: 'Contact',
    title: 'Let’s talk about *your tree*',
    intro:
      'Write to us to order a tree, ask about shipping or create a custom piece. We reply during workshop hours, Monday to Saturday.',
    metaTitle: 'Contact',
    metaDescription:
      'Contact the Antrina workshop in Lima to order a quartz tree, ask about shipping or commission a custom piece.',
    sections: [
      {
        heading: 'Orders and questions',
        paragraphs: [
          'WhatsApp is the fastest way: tell us which tree you like or which intention you are looking for, and we will help you choose and arrange payment and shipping.',
        ],
      },
      {
        heading: 'Workshop',
        paragraphs: [
          'We are a family workshop in Lima, Peru. We do not have a physical store yet: we serve customers online and ship across Peru and abroad.',
        ],
      },
    ],
    cta: {
      title: 'Write to us',
      label: 'Message us on WhatsApp',
      action: 'order',
      message: 'Hi, I have a question.',
    },
  },
  corporate: {
    label: 'Corporate gifts',
    title: 'Corporate gifts *with intention*',
    intro:
      'Custom quartz trees for clients, teams and events: a handmade gift that stays on the desk for years. Quotes from 10 units.',
    metaTitle: 'Handmade custom corporate gifts',
    metaDescription:
      'Unique corporate gifts: quartz trees handmade in Lima, customized with your brand’s stone, size and message. From 10 units.',
    sections: [
      {
        heading: 'Who it is for',
        paragraphs: [
          'Year-end gifts, onboarding, anniversaries, key clients, events and awards. Each tree can carry a different intention depending on the message you want to share.',
        ],
      },
      {
        heading: 'What we customize',
        paragraphs: [
          'The stone or combination of stones (for example, citrine for prosperity or amethyst for calm), the size, the base and a card with your message and logo.',
        ],
      },
      {
        heading: 'How we work',
        paragraphs: [
          'Tell us the occasion, quantity and date. We send a proposal with reference photos and a unit price. Once approved, we make a sample and then produce the full order.',
          'For large orders we recommend getting in touch at least 3 to 4 weeks in advance. We issue invoices.',
        ],
      },
    ],
    faq: [
      { question: 'What is the minimum order?', answer: 'We quote from 10 units.' },
      {
        question: 'How far in advance should I order?',
        answer:
          'For large orders we recommend 3 to 4 weeks. If your date is close, write to us and we will see what is possible.',
      },
      { question: 'Do you issue invoices?', answer: 'Yes, we issue invoices for companies.' },
    ],
    cta: {
      title: 'Request a quote',
      label: 'Request a quote',
      action: 'order',
      message: 'Hi, I would like a quote for corporate gifts.',
    },
  },
  createTree: {
    label: 'Create your tree',
    title: 'Create *your tree*',
    intro:
      'Choose the intention, the stones and the size, and we will build it by hand for you. A one-of-a-kind piece designed from the start for the person who receives it.',
    metaTitle: 'Create your custom quartz tree',
    metaDescription:
      'Design your custom quartz tree: choose the intention, stones and size. Handmade in our Lima workshop and shipped across Peru and worldwide.',
    sections: [
      {
        heading: '1. Choose the intention',
        paragraphs: [
          'Love, abundance, protection, joy or a mix. The intention guides us to suggest the stones that suit it best.',
        ],
      },
      {
        heading: '2. Choose the stones',
        paragraphs: [
          'Start from your favorite stone, your sign’s stone or that of the person you are gifting. We will help you combine them by color.',
        ],
      },
      {
        heading: '3. Choose the size',
        paragraphs: [
          'From a mini for the desk to a signature piece that becomes the centerpiece of the room. We send reference photos and the price before we start.',
        ],
      },
      {
        heading: '4. We make it by hand',
        paragraphs: [
          'Once approved, we build the tree in the workshop (usually 5 to 10 business days) and send you a photo before shipping.',
        ],
      },
    ],
    cta: {
      title: 'Let’s start your tree',
      label: 'Design it on WhatsApp',
      action: 'order',
      message: 'Hi, I would like to create a custom tree.',
    },
  },
};

const PAGES: Record<LocaleCode, Record<ContentPageId, ContentPage>> = { es, en };

export const getContentPage = (locale: LocaleCode, id: ContentPageId) => PAGES[locale][id];
