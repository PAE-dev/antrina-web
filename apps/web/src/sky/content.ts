import { type LocaleCode } from '@antrina/contracts';
import { type Element, type Modality, type MoonPhase, type SignCode } from './astrology';

/**
 * Textos de "Tu cielo" (es/en). Tono de tradición y acompañamiento ("se asocia con"): la
 * astrología como guía simbólica, nunca predicciones ni promesas de salud o dinero.
 */
type L<T> = Record<LocaleCode, T>;

export interface SignSky {
  glyph: string;
  ruler: L<string>;
  keywords: L<[string, string, string]>;
  sun: L<string>;
  moon: L<string>;
}

export const SIGN_SKY: Record<SignCode, SignSky> = {
  ARIES: {
    glyph: '♈︎',
    ruler: { es: 'Marte', en: 'Mars' },
    keywords: { es: ['Impulso', 'Valentía', 'Inicio'], en: ['Drive', 'Courage', 'Beginnings'] },
    sun: {
      es: 'Tu Sol en Aries se asocia con el impulso de empezar. Brillas cuando abres camino, decides rápido y te atreves primero. Tu reto es sostener lo que inicias.',
      en: 'Your Sun in Aries is associated with the urge to begin. You shine when you open the way, decide fast and dare first. Your challenge is to sustain what you start.',
    },
    moon: {
      es: 'Con la Luna en Aries sientes con intensidad y rapidez. Necesitas movimiento y libertad para estar en paz.',
      en: 'With the Moon in Aries you feel fast and fiercely. You need movement and freedom to feel at peace.',
    },
  },
  TAURUS: {
    glyph: '♉︎',
    ruler: { es: 'Venus', en: 'Venus' },
    keywords: { es: ['Calma', 'Constancia', 'Placer'], en: ['Calm', 'Constancy', 'Pleasure'] },
    sun: {
      es: 'Tu Sol en Tauro se asocia con la constancia y el disfrute de lo simple. Construyes despacio y firme, y valoras la belleza que se puede tocar.',
      en: 'Your Sun in Taurus is associated with constancy and the joy of simple things. You build slowly and surely, and value beauty you can touch.',
    },
    moon: {
      es: 'Con la Luna en Tauro buscas seguridad y rutinas que te calmen. Un espacio bonito y tranquilo te devuelve el equilibrio.',
      en: 'With the Moon in Taurus you seek safety and soothing routines. A calm, beautiful space restores your balance.',
    },
  },
  GEMINI: {
    glyph: '♊︎',
    ruler: { es: 'Mercurio', en: 'Mercury' },
    keywords: { es: ['Curiosidad', 'Palabra', 'Ingenio'], en: ['Curiosity', 'Words', 'Wit'] },
    sun: {
      es: 'Tu Sol en Géminis se asocia con la curiosidad y la conversación. Aprendes conectando ideas y personas; tu energía crece cuando compartes lo que descubres.',
      en: 'Your Sun in Gemini is associated with curiosity and conversation. You learn by connecting ideas and people; your energy grows when you share what you find.',
    },
    moon: {
      es: 'Con la Luna en Géminis procesas lo que sientes hablando o escribiendo. Necesitas estímulo y variedad.',
      en: 'With the Moon in Gemini you process feelings by talking or writing. You need stimulation and variety.',
    },
  },
  CANCER: {
    glyph: '♋︎',
    ruler: { es: 'Luna', en: 'Moon' },
    keywords: { es: ['Hogar', 'Cuidado', 'Memoria'], en: ['Home', 'Care', 'Memory'] },
    sun: {
      es: 'Tu Sol en Cáncer se asocia con el cuidado y el hogar. Proteges a los tuyos y tu intuición suele saber antes que tu mente.',
      en: 'Your Sun in Cancer is associated with care and home. You protect your people, and your intuition often knows before your mind does.',
    },
    moon: {
      es: 'Con la Luna en Cáncer tus emociones son profundas y cambiantes como la marea. Necesitas sentirte en casa.',
      en: 'With the Moon in Cancer your emotions run deep and shift like the tide. You need to feel at home.',
    },
  },
  LEO: {
    glyph: '♌︎',
    ruler: { es: 'Sol', en: 'Sun' },
    keywords: { es: ['Brillo', 'Corazón', 'Creación'], en: ['Radiance', 'Heart', 'Creation'] },
    sun: {
      es: 'Tu Sol en Leo se asocia con la creatividad y la generosidad. Iluminas cuando te expresas con el corazón y celebras a los demás.',
      en: 'Your Sun in Leo is associated with creativity and generosity. You light up when you express yourself from the heart and celebrate others.',
    },
    moon: {
      es: 'Con la Luna en Leo necesitas sentirte visto y querido. El juego y el cariño te recargan.',
      en: 'With the Moon in Leo you need to feel seen and loved. Play and affection recharge you.',
    },
  },
  VIRGO: {
    glyph: '♍︎',
    ruler: { es: 'Mercurio', en: 'Mercury' },
    keywords: { es: ['Detalle', 'Servicio', 'Orden'], en: ['Detail', 'Service', 'Order'] },
    sun: {
      es: 'Tu Sol en Virgo se asocia con el cuidado del detalle y el oficio bien hecho. Encuentras sentido en mejorar las cosas, poco a poco.',
      en: 'Your Sun in Virgo is associated with attention to detail and craft done well. You find meaning in improving things, little by little.',
    },
    moon: {
      es: 'Con la Luna en Virgo te calma el orden y sentirte útil. Cuida de no exigirte de más.',
      en: 'With the Moon in Virgo you are soothed by order and feeling useful. Be gentle with your own standards.',
    },
  },
  LIBRA: {
    glyph: '♎︎',
    ruler: { es: 'Venus', en: 'Venus' },
    keywords: { es: ['Armonía', 'Vínculos', 'Belleza'], en: ['Harmony', 'Bonds', 'Beauty'] },
    sun: {
      es: 'Tu Sol en Libra se asocia con la armonía y los vínculos. Tienes un don para mirar los dos lados y crear belleza en lo que compartes.',
      en: 'Your Sun in Libra is associated with harmony and bonds. You have a gift for seeing both sides and creating beauty in what you share.',
    },
    moon: {
      es: 'Con la Luna en Libra necesitas paz en tus relaciones. Los conflictos te pesan más que a otros.',
      en: 'With the Moon in Libra you need peace in your relationships. Conflict weighs on you more than on others.',
    },
  },
  SCORPIO: {
    glyph: '♏︎',
    ruler: { es: 'Plutón y Marte', en: 'Pluto and Mars' },
    keywords: { es: ['Intensidad', 'Verdad', 'Renacer'], en: ['Intensity', 'Truth', 'Rebirth'] },
    sun: {
      es: 'Tu Sol en Escorpio se asocia con la intensidad y la búsqueda de la verdad. Vas al fondo de las cosas y sabes transformarte.',
      en: 'Your Sun in Scorpio is associated with intensity and the search for truth. You go to the bottom of things and know how to transform.',
    },
    moon: {
      es: 'Con la Luna en Escorpio sientes todo a fondo y guardas tu mundo interior con cuidado. La confianza lo es todo.',
      en: 'With the Moon in Scorpio you feel everything deeply and guard your inner world. Trust is everything.',
    },
  },
  SAGITTARIUS: {
    glyph: '♐︎',
    ruler: { es: 'Júpiter', en: 'Jupiter' },
    keywords: { es: ['Viaje', 'Fe', 'Horizonte'], en: ['Journey', 'Faith', 'Horizon'] },
    sun: {
      es: 'Tu Sol en Sagitario se asocia con la aventura y el sentido. Creces explorando, aprendiendo y contagiando optimismo.',
      en: 'Your Sun in Sagittarius is associated with adventure and meaning. You grow by exploring, learning and spreading optimism.',
    },
    moon: {
      es: 'Con la Luna en Sagitario necesitas espacio y horizontes nuevos. La rutina estrecha te apaga.',
      en: 'With the Moon in Sagittarius you need space and new horizons. A narrow routine dims you.',
    },
  },
  CAPRICORN: {
    glyph: '♑︎',
    ruler: { es: 'Saturno', en: 'Saturn' },
    keywords: { es: ['Propósito', 'Disciplina', 'Raíz'], en: ['Purpose', 'Discipline', 'Roots'] },
    sun: {
      es: 'Tu Sol en Capricornio se asocia con el propósito y la constancia. Subes la montaña paso a paso y construyes cosas que duran.',
      en: 'Your Sun in Capricorn is associated with purpose and perseverance. You climb the mountain step by step and build things that last.',
    },
    moon: {
      es: 'Con la Luna en Capricornio te cuesta mostrar lo que sientes, pero eres un refugio firme para los demás.',
      en: 'With the Moon in Capricorn showing feelings is not easy, yet you are a steady refuge for others.',
    },
  },
  AQUARIUS: {
    glyph: '♒︎',
    ruler: { es: 'Urano y Saturno', en: 'Uranus and Saturn' },
    keywords: { es: ['Visión', 'Libertad', 'Comunidad'], en: ['Vision', 'Freedom', 'Community'] },
    sun: {
      es: 'Tu Sol en Acuario se asocia con la originalidad y lo colectivo. Imaginas futuros distintos y te mueve aportar a tu comunidad.',
      en: 'Your Sun in Aquarius is associated with originality and the collective. You imagine different futures and are moved to give to your community.',
    },
    moon: {
      es: 'Con la Luna en Acuario necesitas libertad emocional y amistades que respeten tu espacio.',
      en: 'With the Moon in Aquarius you need emotional freedom and friendships that respect your space.',
    },
  },
  PISCES: {
    glyph: '♓︎',
    ruler: { es: 'Neptuno y Júpiter', en: 'Neptune and Jupiter' },
    keywords: {
      es: ['Intuición', 'Sueño', 'Compasión'],
      en: ['Intuition', 'Dreams', 'Compassion'],
    },
    sun: {
      es: 'Tu Sol en Piscis se asocia con la intuición y la compasión. Sientes lo que otros no dicen y tu imaginación es un refugio.',
      en: 'Your Sun in Pisces is associated with intuition and compassion. You sense what others leave unsaid, and your imagination is a refuge.',
    },
    moon: {
      es: 'Con la Luna en Piscis absorbes el ánimo de tu entorno. El silencio, el agua y el arte te devuelven a ti.',
      en: 'With the Moon in Pisces you absorb the mood around you. Silence, water and art bring you back to yourself.',
    },
  },
};

export const ELEMENT_LABEL: Record<Element, L<string>> = {
  fire: { es: 'Fuego', en: 'Fire' },
  earth: { es: 'Tierra', en: 'Earth' },
  air: { es: 'Aire', en: 'Air' },
  water: { es: 'Agua', en: 'Water' },
};

/** Color de acento por elemento (sutil, sobre la noche marino). */
export const ELEMENT_COLOR: Record<Element, string> = {
  fire: '#e0895a',
  earth: '#a9c48a',
  air: '#b9a8f0',
  water: '#7fc3e0',
};

export const MODALITY_LABEL: Record<Modality, L<string>> = {
  cardinal: { es: 'Cardinal', en: 'Cardinal' },
  fixed: { es: 'Fijo', en: 'Fixed' },
  mutable: { es: 'Mutable', en: 'Mutable' },
};

export const PHASE_LABEL: Record<MoonPhase, L<string>> = {
  new: { es: 'Luna nueva', en: 'New moon' },
  waxing: { es: 'Luna creciente', en: 'Waxing moon' },
  full: { es: 'Luna llena', en: 'Full moon' },
  waning: { es: 'Luna menguante', en: 'Waning moon' },
};

/** Piedras afines a cada elemento (ids de `content/stones.ts`). */
export const ELEMENT_STONES: Record<Element, string[]> = {
  fire: ['cornalina', 'ojo-de-tigre', 'citrino'],
  earth: ['pirita', 'amazonita', 'turmalina-negra', 'obsidiana'],
  air: ['lapislazuli', 'amatista', 'citrino', 'aguamarina'],
  water: ['piedra-luna', 'aguamarina', 'cuarzo-rosa', 'amatista'],
};

export type Area = 'love' | 'money' | 'work' | 'luck';
export const AREAS: Area[] = ['love', 'money', 'work', 'luck'];

export interface AreaContent {
  label: L<string>;
  /** Intención de la tienda a la que lleva. */
  intention: string;
  stones: string[];
  /** Frases por tono: 0 tensión, 1 neutral, 2 fluye. */
  lines: L<[string[], string[], string[]]>;
}

export const AREA_CONTENT: Record<Area, AreaContent> = {
  love: {
    label: { es: 'Amor', en: 'Love' },
    intention: 'amor',
    stones: ['cuarzo-rosa', 'rodonita', 'piedra-luna'],
    lines: {
      es: [
        [
          'Día para escuchar más de lo que hablas. La ternura desarma lo que el orgullo complica.',
          'Si algo te inquieta en una relación, nómbralo con calma y sin prisa por resolverlo hoy.',
          'Cuida tu energía: no todo merece tu respuesta inmediata.',
        ],
        [
          'Un gesto pequeño, un mensaje o una taza compartida, dice más que una gran declaración.',
          'Buen momento para agradecer a quien te sostiene en silencio.',
          'Deja espacio a la sorpresa: el cariño llega por caminos simples.',
        ],
        [
          'Tu corazón está abierto y se nota. Di lo que sientes: hoy se entiende bien.',
          'La conexión fluye; planea algo bonito con alguien que quieres.',
          'Día para reconciliarte, contigo y con los demás.',
        ],
      ],
      en: [
        [
          'A day to listen more than you speak. Tenderness disarms what pride complicates.',
          'If something unsettles you in a relationship, name it calmly, without rushing to fix it today.',
          'Guard your energy: not everything deserves an instant reply.',
        ],
        [
          'A small gesture, a message or a shared cup, says more than a grand declaration.',
          'A good moment to thank the person who quietly holds you up.',
          'Leave room for surprise: affection arrives by simple paths.',
        ],
        [
          'Your heart is open and it shows. Say what you feel: today it lands well.',
          'Connection flows; plan something lovely with someone you love.',
          'A day for making peace, with yourself and with others.',
        ],
      ],
    },
  },
  money: {
    label: { es: 'Dinero', en: 'Money' },
    intention: 'abundancia',
    stones: ['citrino', 'pirita', 'ojo-de-tigre'],
    lines: {
      es: [
        [
          'Mejor revisar que gastar. Ordenar tus cuentas hoy te da calma mañana.',
          'Evita decisiones impulsivas; deja reposar las grandes compras.',
          'Pequeños ahorros, gran tranquilidad.',
        ],
        [
          'Día estable para planear: escribe una meta y el primer paso concreto.',
          'Valora lo que ya tienes antes de buscar más.',
          'Una conversación clara sobre dinero puede abrir una puerta.',
        ],
        [
          'Buena energía para proponer, cobrar lo justo o iniciar un proyecto.',
          'Confía en tu talento: hoy se reconoce.',
          'La abundancia empieza por un orden simple; aprovéchalo.',
        ],
      ],
      en: [
        [
          'Better to review than to spend. Sorting your accounts today brings calm tomorrow.',
          'Avoid impulsive decisions; let big purchases rest.',
          'Small savings, great peace of mind.',
        ],
        [
          'A steady day to plan: write one goal and the first concrete step.',
          'Value what you already have before seeking more.',
          'A clear conversation about money may open a door.',
        ],
        [
          'Good energy to pitch, charge fairly or start a project.',
          'Trust your talent: today it gets noticed.',
          'Abundance starts with simple order; make the most of it.',
        ],
      ],
    },
  },
  work: {
    label: { es: 'Trabajo', en: 'Work' },
    intention: 'felicidad',
    stones: ['ojo-de-tigre', 'cornalina', 'amazonita', 'lapislazuli'],
    lines: {
      es: [
        [
          'Prioriza una sola cosa y termínala; la dispersión cansa más que el trabajo.',
          'Si hay roces, responde mañana con la mente fresca.',
          'Pide ayuda: no es debilidad, es estrategia.',
        ],
        [
          'Día de avance constante. Lo que haces con cuidado se nota.',
          'Buen momento para ordenar tu espacio y tus pendientes.',
          'Escucha una idea distinta a la tuya; puede mejorar la tuya.',
        ],
        [
          'Tu claridad está alta: presenta, decide, lidera.',
          'Las colaboraciones fluyen; suma a alguien a tu idea.',
          'Día para empezar eso que vienes postergando.',
        ],
      ],
      en: [
        [
          'Pick one thing and finish it; scattering tires more than work.',
          'If there is friction, answer tomorrow with a fresh mind.',
          'Ask for help: it is not weakness, it is strategy.',
        ],
        [
          'A day of steady progress. What you do with care shows.',
          'A good moment to tidy your space and your to-do list.',
          'Listen to an idea unlike yours; it may improve your own.',
        ],
        [
          'Your clarity is high: present, decide, lead.',
          'Collaborations flow; bring someone into your idea.',
          'A day to start what you have been putting off.',
        ],
      ],
    },
  },
  luck: {
    label: { es: 'Suerte', en: 'Luck' },
    intention: 'suerte',
    stones: ['ojo-de-tigre', 'pirita', 'aguamarina', 'turquesa'],
    lines: {
      es: [
        [
          'La suerte de hoy está en la paciencia: no fuerces lo que aún no madura.',
          'Protege tu ánimo; elige con quién compartes tus planes.',
          'Un paso atrás también es avanzar.',
        ],
        [
          'Atento a las coincidencias: un encuentro casual puede traer una pista.',
          'Dale una oportunidad a lo inesperado.',
          'La constancia también es una forma de suerte.',
        ],
        [
          'Día luminoso para arriesgarte un poco: di que sí.',
          'Las puertas se abren cuando te mueves; sal y explora.',
          'Tu intuición está afinada: síguela.',
        ],
      ],
      en: [
        [
          "Today's luck lies in patience: do not force what has not ripened yet.",
          'Protect your mood; choose who hears your plans.',
          'A step back is also progress.',
        ],
        [
          'Watch for coincidences: a chance meeting may bring a clue.',
          'Give the unexpected a chance.',
          'Constancy is a kind of luck too.',
        ],
        [
          'A bright day to take a small risk: say yes.',
          'Doors open when you move; go out and explore.',
          'Your intuition is sharp: follow it.',
        ],
      ],
    },
  },
};

export const TONE_LABEL: L<[string, string, string]> = {
  es: ['Día para ir despacio', 'Día en equilibrio', 'Día que fluye'],
  en: ['A day to go slowly', 'A balanced day', 'A flowing day'],
};

export const COMPAT_ROWS: { key: string; label: L<string> }[] = [
  { key: 'moods', label: { es: 'Emociones', en: 'Moods & emotions' } },
  { key: 'talk', label: { es: 'Comunicación', en: 'Communication' } },
  { key: 'love', label: { es: 'Amor y placer', en: 'Love & pleasure' } },
  { key: 'dreams', label: { es: 'Sueños', en: 'Dreams' } },
];

export const COMPAT_TEXT: L<[string, string, string]> = {
  es: [
    'Se complementan desde la diferencia: piden paciencia y escucha, y enseñan mucho.',
    'Una combinación estable: con acuerdos claros, se sostienen bien.',
    'Afinidad natural: se entienden casi sin palabras.',
  ],
  en: [
    'You complement each other through difference: it asks for patience and listening, and teaches a lot.',
    'A steady match: with clear agreements, you hold each other well.',
    'Natural affinity: you understand each other almost without words.',
  ],
};

export interface SkyLabels {
  title: string;
  intro: string;
  start: string;
  privacy: string;
  dateQuestion: string;
  dateHint: string;
  timeQuestion: string;
  timeHint: string;
  noTime: string;
  next: string;
  back: string;
  reading: string;
  yourSun: string;
  yourMoon: string;
  element: string;
  modality: string;
  ruler: string;
  moonUncertain: string;
  tabs: { chart: string; today: string; stones: string; compat: string };
  todayMoon: string;
  stoneForToday: string;
  yourStones: string;
  signatureStone: string;
  moonStone: string;
  forArea: string;
  meaning: string;
  seeTrees: string;
  seeSignTrees: string;
  createTree: string;
  compatTitle: string;
  compatIntro: string;
  compatName: string;
  compatDate: string;
  compatCta: string;
  edit: string;
  forget: string;
  backToForest: string;
  disclaimer: string;
  weekdays: string[];
}

export const SKY_LABELS: L<SkyLabels> = {
  es: {
    title: 'Tu cielo',
    intro:
      'Descubre qué dice el cielo del día en que naciste y qué cuarzos acompañan tu signo en el amor, el dinero, el trabajo y la suerte.',
    start: 'Empezar',
    privacy: 'Tus datos se guardan solo en este dispositivo.',
    dateQuestion: '¿Cuándo naciste?',
    dateHint: 'Con tu fecha calculamos dónde estaba el Sol.',
    timeQuestion: '¿A qué hora?',
    timeHint: 'La hora afina la posición de la Luna. Usa la hora local de tu nacimiento.',
    noTime: 'No sé la hora',
    next: 'Continuar',
    back: 'Atrás',
    reading: 'Leyendo tu cielo…',
    yourSun: 'Sol en',
    yourMoon: 'Luna en',
    element: 'Elemento',
    modality: 'Modalidad',
    ruler: 'Regente',
    moonUncertain: 'Sin hora exacta, tu Luna podría estar en el signo vecino.',
    tabs: { chart: 'Tu carta', today: 'Hoy', stones: 'Cuarzos', compat: 'Compatibilidad' },
    todayMoon: 'La Luna hoy está en',
    stoneForToday: 'Cuarzo para potenciarlo',
    yourStones: 'Tus cuarzos',
    signatureStone: 'Piedra de tu Sol',
    moonStone: 'Piedra de tu Luna',
    forArea: 'Para',
    meaning: 'Significado',
    seeTrees: 'Ver árboles',
    seeSignTrees: 'Árboles para tu signo',
    createTree: 'Crea tu árbol con tus piedras',
    compatTitle: '¿Cómo se lleva tu cielo con el de alguien?',
    compatIntro: 'Escribe su nombre y su fecha de nacimiento.',
    compatName: 'Nombre',
    compatDate: 'Fecha de nacimiento',
    compatCta: 'Ver compatibilidad',
    edit: 'Cambiar mis datos',
    forget: 'Borrar mis datos',
    backToForest: 'Volver al bosque',
    disclaimer:
      'La astrología es una guía simbólica y de tradición: tómala como inspiración, no como predicción.',
    weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  },
  en: {
    title: 'Your sky',
    intro:
      'Discover what the sky said on the day you were born, and which quartz stones accompany your sign in love, money, work and luck.',
    start: 'Begin',
    privacy: 'Your details are stored only on this device.',
    dateQuestion: 'When were you born?',
    dateHint: 'Your date tells us where the Sun was.',
    timeQuestion: 'At what time?',
    timeHint: 'The time refines the position of the Moon. Use the local time of your birth.',
    noTime: "I don't know the time",
    next: 'Continue',
    back: 'Back',
    reading: 'Reading your sky…',
    yourSun: 'Sun in',
    yourMoon: 'Moon in',
    element: 'Element',
    modality: 'Modality',
    ruler: 'Ruler',
    moonUncertain: 'Without an exact time, your Moon may be in the neighbouring sign.',
    tabs: { chart: 'Your chart', today: 'Today', stones: 'Stones', compat: 'Compatibility' },
    todayMoon: 'Today the Moon is in',
    stoneForToday: 'Stone to boost it',
    yourStones: 'Your stones',
    signatureStone: 'Your Sun stone',
    moonStone: 'Your Moon stone',
    forArea: 'For',
    meaning: 'Meaning',
    seeTrees: 'See trees',
    seeSignTrees: 'Trees for your sign',
    createTree: 'Create your tree with your stones',
    compatTitle: 'How does your sky get along with someone else’s?',
    compatIntro: 'Type their name and date of birth.',
    compatName: 'Name',
    compatDate: 'Date of birth',
    compatCta: 'See compatibility',
    edit: 'Change my details',
    forget: 'Delete my details',
    backToForest: 'Back to the forest',
    disclaimer:
      'Astrology is a symbolic, traditional guide: take it as inspiration, not as a prediction.',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
};

/** Color de cada piedra para su muestra en la app (ids de `content/stones.ts`). */
export const STONE_HEX: Record<string, string> = {
  citrino: '#e9b949',
  pirita: '#c9a85a',
  'cuarzo-rosa': '#f2b8c6',
  rodonita: '#d97f93',
  'turmalina-negra': '#3a3a40',
  amatista: '#a07bd6',
  cornalina: '#d9673a',
  'ojo-de-tigre': '#b8823a',
  'piedra-luna': '#e6ecf5',
  amazonita: '#7fc4b4',
  lapislazuli: '#3557a8',
  obsidiana: '#22232a',
  turquesa: '#3fb5b0',
  aguamarina: '#9fd6e8',
};
