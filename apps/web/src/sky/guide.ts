import { type LocaleCode } from '@antrina/contracts';
import { type SignCode } from './astrology';

/**
 * Textos de "Tu cielo": glosario, onboarding, guía diaria y respuestas (es/en).
 * Tono de tradición y acompañamiento: la astrología como guía simbólica, nunca predicción.
 */
type L<T> = Record<LocaleCode, T>;

export type Body =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'ascendant';
export type AspectKind = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export type Nature = 'flow' | 'tension' | 'blend';
export type AskTopic = 'self' | 'love' | 'work' | 'money';
export type GlossaryKey =
  | 'sun'
  | 'moon'
  | 'ascendant'
  | 'planets'
  | 'houses'
  | 'transits'
  | 'aspects'
  | 'elements'
  | 'phases';

/* ------------------------------------------------------------------ */
/* Cuerpos celestes                                                    */
/* ------------------------------------------------------------------ */

export const BODY_INFO: Record<Body, { glyph: string; name: L<string>; meaning: L<string> }> = {
  sun: {
    glyph: '☉︎',
    name: { es: 'Sol', en: 'Sun' },
    meaning: {
      es: 'Tu esencia: lo que te da energía y te hace sentir en tu centro. Se asocia con tu propósito y con la forma en que brillas.',
      en: 'Your core: what gives you energy and makes you feel like yourself. It is linked to your purpose and the way you shine.',
    },
  },
  moon: {
    glyph: '☽︎',
    name: { es: 'Luna', en: 'Moon' },
    meaning: {
      es: 'Tus emociones y lo que necesitas para sentirte en paz. Habla de tu mundo íntimo, tus hábitos y lo que te da seguridad.',
      en: 'Your emotions and what you need to feel at peace. It speaks of your inner world, your habits and what makes you feel safe.',
    },
  },
  mercury: {
    glyph: '☿︎',
    name: { es: 'Mercurio', en: 'Mercury' },
    meaning: {
      es: 'Tu forma de pensar, aprender y comunicarte. Se asocia con cómo hablas, escribes y ordenas tus ideas.',
      en: 'How you think, learn and communicate. It is linked to the way you speak, write and organize your ideas.',
    },
  },
  venus: {
    glyph: '♀︎',
    name: { es: 'Venus', en: 'Venus' },
    meaning: {
      es: 'Tu manera de amar y de disfrutar. Habla de lo que te parece bello, de tus gustos y de lo que valoras.',
      en: 'How you love and how you enjoy life. It speaks of what you find beautiful, your tastes and what you value.',
    },
  },
  mars: {
    glyph: '♂︎',
    name: { es: 'Marte', en: 'Mars' },
    meaning: {
      es: 'Tu impulso, tu deseo y tu forma de actuar. Se asocia con cómo defiendes lo tuyo y con lo que te enciende.',
      en: 'Your drive, your desire and the way you act. It is linked to how you stand up for yourself and what fires you up.',
    },
  },
  jupiter: {
    glyph: '♃︎',
    name: { es: 'Júpiter', en: 'Jupiter' },
    meaning: {
      es: 'Dónde creces y te expandes. Se asocia con la confianza, la generosidad y las ganas de explorar.',
      en: 'Where you grow and expand. It is linked to confidence, generosity and the urge to explore.',
    },
  },
  saturn: {
    glyph: '♄︎',
    name: { es: 'Saturno', en: 'Saturn' },
    meaning: {
      es: 'Tus límites, tu disciplina y lo que construyes con paciencia. Invita a madurar y a asumir responsabilidad.',
      en: 'Your limits, your discipline and what you build with patience. It invites you to mature and take responsibility.',
    },
  },
  uranus: {
    glyph: '♅︎',
    name: { es: 'Urano', en: 'Uranus' },
    meaning: {
      es: 'Tu lado original y libre. Se asocia con los cambios repentinos, la rebeldía y las ideas nuevas.',
      en: 'Your original, free side. It is linked to sudden change, rebellion and new ideas.',
    },
  },
  neptune: {
    glyph: '♆︎',
    name: { es: 'Neptuno', en: 'Neptune' },
    meaning: {
      es: 'Tus sueños, tu sensibilidad y tu imaginación. Habla de la inspiración y de lo que te conecta con algo más grande.',
      en: 'Your dreams, your sensitivity and your imagination. It speaks of inspiration and what connects you to something bigger.',
    },
  },
  pluto: {
    glyph: '♇︎',
    name: { es: 'Plutón', en: 'Pluto' },
    meaning: {
      es: 'Tu capacidad de transformarte desde lo profundo. Se asocia con soltar lo que ya cumplió su ciclo y renacer.',
      en: 'Your power to transform from the inside. It is linked to letting go of what has run its course and starting anew.',
    },
  },
  ascendant: {
    glyph: '↑︎',
    name: { es: 'Ascendente', en: 'Rising' },
    meaning: {
      es: 'La primera impresión que das y tu forma de empezar las cosas. Es como la puerta de entrada a tu carta.',
      en: 'The first impression you give and the way you begin things. Think of it as the front door of your chart.',
    },
  },
};

/* ------------------------------------------------------------------ */
/* Aspectos                                                            */
/* ------------------------------------------------------------------ */

export const ASPECT_INFO: Record<
  AspectKind,
  { glyph: string; name: L<string>; meaning: L<string>; nature: Nature }
> = {
  conjunction: {
    glyph: '☌︎',
    name: { es: 'Conjunción', en: 'Conjunction' },
    meaning: {
      es: 'Dos planetas muy juntos que suman sus energías. Se vive con intensidad, para bien o para aprender.',
      en: 'Two planets close together, blending their energies. It feels intense, whether it brings ease or a lesson.',
    },
    nature: 'blend',
  },
  sextile: {
    glyph: '⚹︎',
    name: { es: 'Sextil', en: 'Sextile' },
    meaning: {
      es: 'Una conexión amable que abre pequeñas oportunidades. Funciona mejor si das el primer paso.',
      en: 'A friendly connection that opens small opportunities. It works best when you take the first step.',
    },
    nature: 'flow',
  },
  square: {
    glyph: '□︎',
    name: { es: 'Cuadratura', en: 'Square' },
    meaning: {
      es: 'Una fricción entre dos energías que quieren cosas distintas. Incomoda, pero invita a moverte y crecer.',
      en: 'Friction between two energies that want different things. It is uncomfortable, but it invites you to move and grow.',
    },
    nature: 'tension',
  },
  trine: {
    glyph: '△︎',
    name: { es: 'Trígono', en: 'Trine' },
    meaning: {
      es: 'Una armonía natural, como un río que fluye sin esfuerzo. Señala talentos y facilidades.',
      en: 'A natural harmony, like a river flowing with no effort. It points to talents and ease.',
    },
    nature: 'flow',
  },
  opposition: {
    glyph: '☍︎',
    name: { es: 'Oposición', en: 'Opposition' },
    meaning: {
      es: 'Dos energías frente a frente que piden equilibrio. Suele reflejarse en tus vínculos con otras personas.',
      en: 'Two energies facing each other and asking for balance. It often shows up in your relationships with others.',
    },
    nature: 'tension',
  },
};

/* ------------------------------------------------------------------ */
/* Casas                                                               */
/* ------------------------------------------------------------------ */

export const HOUSE_INFO: L<string[]> = {
  es: [
    'Casa 1 · Identidad, cuerpo y cómo empiezas',
    'Casa 2 · Dinero, recursos y lo que valoras',
    'Casa 3 · Comunicación, hermanos y lo cotidiano',
    'Casa 4 · Hogar, familia y raíces',
    'Casa 5 · Creatividad, romance y alegría',
    'Casa 6 · Rutina, trabajo diario y bienestar',
    'Casa 7 · Pareja, socios y vínculos',
    'Casa 8 · Intimidad, cambios y lo compartido',
    'Casa 9 · Viajes, estudios y sentido de vida',
    'Casa 10 · Carrera, metas y reputación',
    'Casa 11 · Amistades, grupos y sueños',
    'Casa 12 · Descanso, intuición y lo invisible',
  ],
  en: [
    'House 1 · Identity, body and how you begin',
    'House 2 · Money, resources and what you value',
    'House 3 · Communication, siblings and daily life',
    'House 4 · Home, family and roots',
    'House 5 · Creativity, romance and joy',
    'House 6 · Routine, daily work and well-being',
    'House 7 · Partners, allies and bonds',
    'House 8 · Intimacy, change and what is shared',
    'House 9 · Travel, learning and meaning',
    'House 10 · Career, goals and reputation',
    'House 11 · Friends, communities and dreams',
    'House 12 · Rest, intuition and the unseen',
  ],
};

/* ------------------------------------------------------------------ */
/* Luna del día                                                        */
/* ------------------------------------------------------------------ */

export const MOON_DAY: Record<SignCode, L<{ mood: string; tip: string }>> = {
  ARIES: {
    es: {
      mood: 'Con la Luna en Aries el ambiente se acelera y las emociones salen rápido. Hay ganas de empezar y poca paciencia.',
      tip: 'Arranca esa tarea que vienes postergando, aunque sea por diez minutos.',
    },
    en: {
      mood: 'With the Moon in Aries the mood speeds up and feelings come out fast. There is an urge to start and little patience.',
      tip: 'Begin the task you keep putting off, even if only for ten minutes.',
    },
  },
  TAURUS: {
    es: {
      mood: 'Con la Luna en Tauro el día pide calma, comodidad y placeres simples. Todo se disfruta más a ritmo lento.',
      tip: 'Prepara una comida rica y cómela sin pantallas.',
    },
    en: {
      mood: 'With the Moon in Taurus the day asks for calm, comfort and simple pleasures. Everything tastes better at a slow pace.',
      tip: 'Cook something you love and eat it with no screens around.',
    },
  },
  GEMINI: {
    es: {
      mood: 'Con la Luna en Géminis la mente va de un tema a otro y la conversación fluye. Es un día curioso e inquieto.',
      tip: 'Escríbele a alguien con quien hace tiempo no hablas.',
    },
    en: {
      mood: 'With the Moon in Gemini the mind jumps from topic to topic and conversation flows. It is a curious, restless day.',
      tip: 'Message someone you have not talked to in a while.',
    },
  },
  CANCER: {
    es: {
      mood: 'Con la Luna en Cáncer las emociones están a flor de piel y se busca refugio. El hogar y la familia se sienten cerca.',
      tip: 'Regálate un rato en casa, con una bebida tibia y tu manta favorita.',
    },
    en: {
      mood: 'With the Moon in Cancer feelings run close to the surface and people seek shelter. Home and family feel near.',
      tip: 'Give yourself some time at home with a warm drink and your favorite blanket.',
    },
  },
  LEO: {
    es: {
      mood: 'Con la Luna en Leo hay ganas de brillar, jugar y sentirse visto. El corazón pide reconocimiento y alegría.',
      tip: 'Haz algo creativo solo por el gusto de hacerlo.',
    },
    en: {
      mood: 'With the Moon in Leo there is a wish to shine, play and be seen. The heart asks for recognition and joy.',
      tip: 'Make something creative just for the fun of it.',
    },
  },
  VIRGO: {
    es: {
      mood: 'Con la Luna en Virgo el ambiente invita a ordenar, mejorar y cuidar los detalles. Lo práctico da tranquilidad.',
      tip: 'Ordena un cajón o tu escritorio y nota cómo se aclara tu mente.',
    },
    en: {
      mood: 'With the Moon in Virgo the mood invites you to tidy up, improve and mind the details. Practical things bring calm.',
      tip: 'Clear one drawer or your desk and notice how your mind clears too.',
    },
  },
  LIBRA: {
    es: {
      mood: 'Con la Luna en Libra el ambiente pide armonía, belleza y acuerdos. Cuesta decidir, pero es fácil conectar.',
      tip: 'Busca un punto medio en esa conversación pendiente.',
    },
    en: {
      mood: 'With the Moon in Libra the mood asks for harmony, beauty and agreement. Deciding is harder, connecting is easier.',
      tip: 'Look for the middle ground in that pending conversation.',
    },
  },
  SCORPIO: {
    es: {
      mood: 'Con la Luna en Escorpio las emociones se vuelven profundas e intensas. Hay poca tolerancia a lo superficial.',
      tip: 'Escribe lo que de verdad sientes, aunque no se lo muestres a nadie.',
    },
    en: {
      mood: 'With the Moon in Scorpio emotions turn deep and intense. There is little room for small talk.',
      tip: 'Write down what you truly feel, even if you never show it to anyone.',
    },
  },
  SAGITTARIUS: {
    es: {
      mood: 'Con la Luna en Sagitario el ánimo se vuelve optimista y aventurero. Se respira ganas de libertad y de reír.',
      tip: 'Cambia tu ruta de siempre y descubre algo nuevo en el camino.',
    },
    en: {
      mood: 'With the Moon in Sagittarius spirits turn hopeful and adventurous. There is a taste for freedom and laughter.',
      tip: 'Take a different route today and discover something new on the way.',
    },
  },
  CAPRICORN: {
    es: {
      mood: 'Con la Luna en Capricornio el día se siente serio y enfocado. Las emociones se ordenan alrededor de las metas.',
      tip: 'Elige una sola prioridad y avanza en ella con calma.',
    },
    en: {
      mood: 'With the Moon in Capricorn the day feels serious and focused. Feelings organize themselves around goals.',
      tip: 'Pick one priority and move it forward, steadily.',
    },
  },
  AQUARIUS: {
    es: {
      mood: 'Con la Luna en Acuario el ambiente se vuelve más mental y libre. Se valora el espacio propio y las ideas distintas.',
      tip: 'Date permiso para hacer algo a tu manera, aunque sea raro.',
    },
    en: {
      mood: 'With the Moon in Aquarius the mood turns more cerebral and free. Personal space and unusual ideas are welcome.',
      tip: 'Allow yourself to do one thing your own way, even if it is odd.',
    },
  },
  PISCES: {
    es: {
      mood: 'Con la Luna en Piscis todo se siente más suave, sensible y soñador. La intuición está despierta.',
      tip: 'Escucha música sin hacer nada más y deja que tu mente vague.',
    },
    en: {
      mood: 'With the Moon in Pisces everything feels softer, more sensitive and dreamy. Intuition is wide awake.',
      tip: 'Listen to music without doing anything else and let your mind wander.',
    },
  },
};

/* ------------------------------------------------------------------ */
/* Glosario                                                            */
/* ------------------------------------------------------------------ */

export const GLOSSARY: { key: GlossaryKey; title: L<string>; body: L<string> }[] = [
  {
    key: 'sun',
    title: { es: 'El Sol', en: 'The Sun' },
    body: {
      es: 'Es tu signo “de siempre”, el que conoces por tu fecha de cumpleaños. Representa tu esencia y lo que te da energía. Piensa en él como el motor que te impulsa a ser quien eres.',
      en: 'It is the sign you already know from your birthday. It represents your core and what gives you energy. Think of it as the engine that moves you to be who you are.',
    },
  },
  {
    key: 'moon',
    title: { es: 'La Luna', en: 'The Moon' },
    body: {
      es: 'Muestra tu mundo emocional: cómo sientes y qué necesitas para estar en paz. Es la parte de ti que aparece en confianza, en casa o cuando te falta energía. Conocerla te ayuda a cuidarte mejor.',
      en: 'It shows your emotional world: how you feel and what you need to be at peace. It is the part of you that appears at home, among people you trust, or when you are tired. Knowing it helps you care for yourself.',
    },
  },
  {
    key: 'ascendant',
    title: { es: 'El Ascendente', en: 'The Rising sign' },
    body: {
      es: 'Es el signo que asomaba en el horizonte justo cuando naciste. Se asocia con la primera impresión que das y con tu forma de empezar las cosas. Para calcularlo se necesita tu hora y lugar de nacimiento.',
      en: 'It is the sign that was rising on the horizon the moment you were born. It is linked to the first impression you give and how you begin things. To find it, you need your birth time and place.',
    },
  },
  {
    key: 'planets',
    title: { es: 'Los planetas', en: 'The planets' },
    body: {
      es: 'Cada planeta representa una parte de tu vida interior: Mercurio la mente, Venus el amor, Marte el impulso, y así. El signo donde estaba cada uno al nacer colorea esa parte de ti. Juntos forman algo así como un equipo con distintos talentos.',
      en: 'Each planet stands for a part of your inner life: Mercury for the mind, Venus for love, Mars for drive, and so on. The sign each one was in when you were born colors that part of you. Together they work like a team with different talents.',
    },
  },
  {
    key: 'houses',
    title: { es: 'Las casas', en: 'The houses' },
    body: {
      es: 'Tu carta se divide en 12 casas, y cada una es un área de la vida: hogar, pareja, trabajo, amistades y más. Los planetas que caen en cada casa muestran dónde se concentra tu energía. Para calcularlas hacen falta tu hora y lugar de nacimiento exactos.',
      en: 'Your chart is divided into 12 houses, and each one is an area of life: home, partnership, work, friendship and more. The planets in each house show where your energy gathers. To calculate them, you need your exact birth time and place.',
    },
  },
  {
    key: 'transits',
    title: { es: 'Los tránsitos', en: 'Transits' },
    body: {
      es: 'Los planetas siguen moviéndose hoy, aunque tu carta natal quede fija. Cuando un planeta del cielo actual “toca” un punto de tu carta, se dice que hay un tránsito. Por eso algunos días se sienten distintos: es buen momento para leerlos como un clima, no como un destino.',
      en: 'The planets keep moving today, even though your birth chart stays fixed. When a planet in today’s sky “touches” a point in your chart, that is called a transit. That is why some days feel different: read them like weather, not like fate.',
    },
  },
  {
    key: 'aspects',
    title: { es: 'Los aspectos', en: 'Aspects' },
    body: {
      es: 'Son los ángulos que forman los planetas entre sí, como conversaciones entre ellos. Algunos fluyen con facilidad, como el trígono o el sextil. Otros generan fricción, como la cuadratura o la oposición, e invitan a crecer.',
      en: 'They are the angles planets form with each other, like conversations between them. Some flow easily, such as the trine or sextile. Others create friction, such as the square or opposition, and invite you to grow.',
    },
  },
  {
    key: 'elements',
    title: { es: 'Los elementos', en: 'The elements' },
    body: {
      es: 'Los signos se agrupan en cuatro elementos. Fuego (Aries, Leo, Sagitario) es entusiasmo; Tierra (Tauro, Virgo, Capricornio) es lo práctico; Aire (Géminis, Libra, Acuario) son las ideas; y Agua (Cáncer, Escorpio, Piscis) son las emociones. Ver cuál predomina en tu carta te da una pista de tu temperamento.',
      en: 'The signs are grouped into four elements. Fire (Aries, Leo, Sagittarius) is enthusiasm; Earth (Taurus, Virgo, Capricorn) is practicality; Air (Gemini, Libra, Aquarius) is ideas; and Water (Cancer, Scorpio, Pisces) is emotion. The one that stands out in your chart hints at your temperament.',
    },
  },
  {
    key: 'phases',
    title: { es: 'Las fases lunares', en: 'Moon phases' },
    body: {
      es: 'La Luna nueva se asocia con sembrar intenciones y empezar de cero. En la creciente es buen momento para avanzar y construir. La Luna llena ilumina lo que ya creció y suele sentirse intensa; en la menguante se invita a soltar, ordenar y descansar.',
      en: 'The new Moon is linked to setting intentions and starting fresh. The waxing Moon is a good time to move forward and build. The full Moon lights up what has grown and often feels intense; the waning Moon invites you to let go, tidy up and rest.',
    },
  },
];

/* ------------------------------------------------------------------ */
/* Tutorial de bienvenida                                              */
/* ------------------------------------------------------------------ */

export const INTRO_SLIDES: L<{ title: string; body: string }[]> = {
  es: [
    {
      title: 'Tu carta natal',
      body: 'Es una foto del cielo en el momento exacto en que naciste. Muestra dónde estaban el Sol, la Luna y los planetas. La astrología la lee como un mapa simbólico de tu forma de ser.',
    },
    {
      title: 'Tus tres grandes',
      body: 'El Sol es tu esencia, la Luna tus emociones y el Ascendente la impresión que das. Estos tres signos dicen mucho de ti. Con tu hora de nacimiento podemos calcularlos todos.',
    },
    {
      title: 'Por qué cambia tu día',
      body: 'Los planetas siguen moviéndose y, al pasar, “tocan” tu carta. Eso son los tránsitos. Cada día te mostramos qué se activa para que lo vivas con más conciencia.',
    },
    {
      title: 'Tu cuarzo compañero',
      body: 'En Antrina relacionamos cada cielo con piedras que, por tradición, acompañan esa energía. No son amuletos mágicos: son recordatorios bellos de tu intención. Un árbol de cuarzo hecho a mano puede ser tu ancla diaria.',
    },
  ],
  en: [
    {
      title: 'Your birth chart',
      body: 'It is a photo of the sky at the exact moment you were born. It shows where the Sun, the Moon and the planets were. Astrology reads it as a symbolic map of who you are.',
    },
    {
      title: 'Your big three',
      body: 'The Sun is your core, the Moon your emotions and the Rising sign the impression you give. These three signs say a lot about you. With your birth time we can calculate all of them.',
    },
    {
      title: 'Why your day changes',
      body: 'The planets keep moving and, as they pass, they “touch” your chart. Those are transits. Each day we show you what is stirring so you can live it more mindfully.',
    },
    {
      title: 'Your quartz companion',
      body: 'At Antrina we pair each sky with stones that, by tradition, accompany that energy. They are not magic charms: they are beautiful reminders of your intention. A handmade quartz tree can be your daily anchor.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Frases de revelación por signo                                      */
/* ------------------------------------------------------------------ */

export const REVEAL_LINES: Record<SignCode, L<[string, string, string]>> = {
  ARIES: {
    es: ['Primero actúa, luego piensa', 'Todo o nada', 'Fuego en el pecho'],
    en: ['Acts first, thinks later', 'All or nothing', 'Fire in the chest'],
  },
  TAURUS: {
    es: ['Ama la calma', 'Placeres sin prisa', 'Leal hasta el final'],
    en: ['Loves the calm', 'Unhurried pleasures', 'Loyal to the end'],
  },
  GEMINI: {
    es: ['Mil ideas por minuto', 'Siempre con una pregunta', 'Charla infinita'],
    en: ['A thousand ideas a minute', 'Always has a question', 'Endless conversation'],
  },
  CANCER: {
    es: ['Quiere abrazos', 'Hogar de corazón', 'Guarda cada recuerdo'],
    en: ['Wants hugs', 'Home at heart', 'Keeps every memory'],
  },
  LEO: {
    es: ['Nació para brillar', 'Corazón generoso', 'Ama los aplausos'],
    en: ['Born to shine', 'Generous heart', 'Loves applause'],
  },
  VIRGO: {
    es: ['Cuida cada detalle', 'Listas para todo', 'Ayuda sin que pidas'],
    en: ['Minds every detail', 'A list for everything', 'Helps before you ask'],
  },
  LIBRA: {
    es: ['Busca la armonía', 'Ojo para lo bello', 'Le cuesta decidir'],
    en: ['Seeks harmony', 'An eye for beauty', 'Decisions are hard'],
  },
  SCORPIO: {
    es: ['Siente todo profundo', 'Mirada que lee almas', 'Secretos bien guardados'],
    en: ['Feels everything deeply', 'Eyes that read souls', 'Secrets well kept'],
  },
  SAGITTARIUS: {
    es: ['Maleta siempre lista', 'Risa contagiosa', 'Ama la libertad'],
    en: ['Bag always packed', 'Contagious laugh', 'Loves freedom'],
  },
  CAPRICORN: {
    es: ['Metas a largo plazo', 'Humor seco', 'Construye con paciencia'],
    en: ['Long-term goals', 'Dry humor', 'Builds with patience'],
  },
  AQUARIUS: {
    es: ['Piensa distinto', 'Amistad ante todo', 'Viene del futuro'],
    en: ['Thinks differently', 'Friendship above all', 'Here from the future'],
  },
  PISCES: {
    es: ['Sueña despierto', 'Empatía sin fondo', 'Vive en canciones'],
    en: ['Daydreams often', 'Bottomless empathy', 'Lives in songs'],
  },
};

/* ------------------------------------------------------------------ */
/* Guía diaria                                                         */
/* ------------------------------------------------------------------ */

export const DAILY: Record<Nature, L<{ headline: string; body: string }[]>> = {
  flow: {
    es: [
      {
        headline: 'Di que sí.',
        body: 'Hoy las cosas se acomodan con menos esfuerzo de lo habitual. Si aparece una invitación o una idea que te entusiasma, no la analices de más. Un sí pequeño puede abrir una puerta bonita.',
      },
      {
        headline: 'Comparte lo tuyo.',
        body: 'Es buen momento para mostrar lo que haces o lo que sientes. La gente está más receptiva y tu voz llega con claridad. No esperes a que esté perfecto.',
      },
      {
        headline: 'Disfruta sin culpa.',
        body: 'El día invita al placer simple: una comida rica, una canción, una caminata. No todo tiene que ser productivo. Recargar también es avanzar.',
      },
      {
        headline: 'Confía en ti.',
        body: 'Tu intuición está afinada y tus decisiones tienen buen pulso. Escucha esa primera respuesta que aparece antes de la duda. Hoy tu criterio merece tu confianza.',
      },
      {
        headline: 'Agradece en voz alta.',
        body: 'Hay cosas que están saliendo bien, aunque no siempre las notes. Dile a alguien lo que valoras de su compañía. La gratitud dicha en voz alta multiplica el buen ánimo.',
      },
      {
        headline: 'Empieza algo nuevo.',
        body: 'La energía del día favorece los comienzos. Ese proyecto, curso o hábito que tienes en mente encuentra hoy un terreno amable. Da el primer paso, aunque sea pequeño.',
      },
      {
        headline: 'Acércate a alguien.',
        body: 'Los vínculos fluyen con facilidad. Es buen momento para retomar una amistad o profundizar una conversación. Un mensaje sencillo puede alegrarle el día a alguien.',
      },
      {
        headline: 'Déjate llevar.',
        body: 'No necesitas controlar cada detalle hoy. Permite que el día te sorprenda y sigue lo que te da curiosidad. A veces el mejor plan es no tener uno.',
      },
      {
        headline: 'Celebra lo logrado.',
        body: 'Mira hacia atrás un momento y reconoce cuánto has avanzado. Has superado cosas que antes parecían enormes. Date crédito, te lo has ganado.',
      },
    ],
    en: [
      {
        headline: 'Say yes.',
        body: 'Things fall into place with less effort than usual today. If an invitation or an exciting idea shows up, do not overthink it. A small yes can open a lovely door.',
      },
      {
        headline: 'Share your work.',
        body: 'It is a good moment to show what you make or what you feel. People are more open and your voice comes through clearly. Do not wait for it to be perfect.',
      },
      {
        headline: 'Enjoy, guilt-free.',
        body: 'The day invites simple pleasure: a good meal, a song, a walk. Not everything has to be productive. Recharging is also a way forward.',
      },
      {
        headline: 'Trust yourself.',
        body: 'Your intuition is sharp and your choices have a good rhythm. Listen to the first answer that comes before doubt does. Today your judgment deserves your trust.',
      },
      {
        headline: 'Say thank you.',
        body: 'Some things are going well, even if you do not always notice. Tell someone what you value about having them around. Gratitude spoken out loud lifts everyone’s mood.',
      },
      {
        headline: 'Start something new.',
        body: 'Today’s energy favors beginnings. That project, class or habit on your mind finds friendly ground. Take the first step, however small.',
      },
      {
        headline: 'Reach out.',
        body: 'Connections flow easily. It is a good time to revive a friendship or deepen a conversation. A simple message can brighten someone’s day.',
      },
      {
        headline: 'Go with it.',
        body: 'You do not need to control every detail today. Let the day surprise you and follow what makes you curious. Sometimes the best plan is having none.',
      },
      {
        headline: 'Celebrate your progress.',
        body: 'Look back for a moment and notice how far you have come. You have moved through things that once felt huge. Give yourself credit, you earned it.',
      },
    ],
  },
  tension: {
    es: [
      {
        headline: 'Baja el ritmo.',
        body: 'Hoy puede haber roces o cansancio extra. No es una señal de que algo vaya mal, solo una invitación a ir más despacio. Haz menos, pero hazlo con presencia.',
      },
      {
        headline: 'Perdónate.',
        body: 'Si algo no salió como esperabas, no cargues con todo el peso. Equivocarse es parte de aprender. Háblate con la misma ternura que usarías con alguien que quieres.',
      },
      {
        headline: 'Respira antes.',
        body: 'Las emociones pueden estar más reactivas de lo normal. Antes de responder ese mensaje o esa crítica, toma tres respiraciones. La pausa es tu mejor aliada hoy.',
      },
      {
        headline: 'Pon un límite.',
        body: 'Es buen momento para notar dónde estás dando de más. Decir que no también es una forma de cuidarte. Un límite claro hoy evita un resentimiento mañana.',
      },
      {
        headline: 'Suelta el control.',
        body: 'Algunas cosas no dependen de ti, y está bien. Concéntrate en lo que sí puedes mover y deja ir el resto. La calma llega cuando dejas de empujar la puerta equivocada.',
      },
      {
        headline: 'Escucha más.',
        body: 'Los malentendidos están a la vuelta de la esquina. Antes de defender tu punto, intenta entender el del otro. A veces la gente solo necesita sentirse escuchada.',
      },
      {
        headline: 'No decidas hoy.',
        body: 'Si sientes presión para elegir algo importante, date un poco de tiempo. Las decisiones tomadas desde la tensión rara vez son las mejores. Mañana verás todo con otra luz.',
      },
      {
        headline: 'Busca tu refugio.',
        body: 'El día puede sentirse pesado o ruidoso. Identifica qué te devuelve la calma: un lugar, una persona, una canción. Ve hacia ahí sin pedir permiso.',
      },
      {
        headline: 'Mueve el cuerpo.',
        body: 'La tensión acumulada necesita salir por algún lado. Una caminata, estirarte o bailar en tu cuarto puede cambiar tu ánimo. Deja que el movimiento ordene lo que la mente no puede.',
      },
    ],
    en: [
      {
        headline: 'Slow down.',
        body: 'Today may bring friction or extra tiredness. It is not a sign that something is wrong, just an invitation to go slower. Do less, but do it with presence.',
      },
      {
        headline: 'Forgive yourself.',
        body: 'If something did not go as you hoped, do not carry all the weight. Mistakes are part of learning. Speak to yourself as tenderly as you would to someone you love.',
      },
      {
        headline: 'Breathe first.',
        body: 'Emotions may be more reactive than usual. Before answering that message or that criticism, take three breaths. A pause is your best ally today.',
      },
      {
        headline: 'Set a boundary.',
        body: 'It is a good moment to notice where you are giving too much. Saying no is also a way of caring for yourself. A clear limit today prevents resentment tomorrow.',
      },
      {
        headline: 'Loosen your grip.',
        body: 'Some things are not up to you, and that is okay. Focus on what you can move and let the rest go. Calm arrives when you stop pushing the wrong door.',
      },
      {
        headline: 'Listen more.',
        body: 'Misunderstandings are around the corner. Before defending your point, try to understand theirs. Sometimes people only need to feel heard.',
      },
      {
        headline: 'Decide later.',
        body: 'If you feel pressured to choose something important, give yourself a little time. Choices made under tension are rarely the best ones. Tomorrow things will look different.',
      },
      {
        headline: 'Find your shelter.',
        body: 'The day may feel heavy or loud. Notice what brings you back to calm: a place, a person, a song. Go there without asking permission.',
      },
      {
        headline: 'Move your body.',
        body: 'Built-up tension needs somewhere to go. A walk, a stretch or dancing in your room can shift your mood. Let movement sort out what your mind cannot.',
      },
    ],
  },
  blend: {
    es: [
      {
        headline: 'Mira hacia adentro.',
        body: 'Hoy se mezclan energías intensas que pueden llevarte en varias direcciones. Antes de elegir un camino, pregúntate qué quieres de verdad. La respuesta ya está en ti.',
      },
      {
        headline: 'Une los puntos.',
        body: 'Cosas que parecían separadas empiezan a tener sentido juntas. Presta atención a las coincidencias y a las ideas que se repiten. Algo se está aclarando.',
      },
      {
        headline: 'Elige tu intención.',
        body: 'La energía del día es potente, pero necesita dirección. Escribe en una frase lo que quieres cultivar. Con una intención clara, la intensidad se vuelve impulso.',
      },
      {
        headline: 'Abraza el cambio.',
        body: 'Algo se está transformando, aunque todavía no sepas en qué. No hace falta entenderlo todo ahora. Confía en que estás en medio de un proceso.',
      },
      {
        headline: 'Dite la verdad.',
        body: 'Hoy cuesta esconder lo que sientes, incluso de ti. Es buen momento para reconocer una verdad que venías evitando. Nombrarla ya es empezar a sanarla.',
      },
      {
        headline: 'Concentra tu fuerza.',
        body: 'Tienes mucha energía disponible, pero dispersa no rinde. Elige una sola cosa y dale toda tu atención. Lo que hagas con foco hoy deja huella.',
      },
      {
        headline: 'Mezcla lo distinto.',
        body: 'Es un día para combinar lo que no suele ir junto: lógica y emoción, trabajo y juego. Las mejores ideas nacen de cruces inesperados. Prueba algo fuera de tu costumbre.',
      },
      {
        headline: 'Habita el momento.',
        body: 'Las emociones pueden sentirse amplificadas, tanto las bonitas como las difíciles. No las apures ni las juzgues. Vívelas con atención, son información valiosa.',
      },
      {
        headline: 'Renueva un hábito.',
        body: 'La intensidad del día es buena aliada para reinventar algo cotidiano. Cambia una pequeña rutina que ya no te sirve. Lo simple, hecho distinto, puede renovarte.',
      },
    ],
    en: [
      {
        headline: 'Look within.',
        body: 'Intense energies blend today and may pull you in several directions. Before choosing a path, ask yourself what you truly want. The answer is already in you.',
      },
      {
        headline: 'Connect the dots.',
        body: 'Things that seemed separate start to make sense together. Pay attention to coincidences and ideas that keep returning. Something is becoming clear.',
      },
      {
        headline: 'Choose your intention.',
        body: 'The day’s energy is strong, but it needs direction. Write down in one sentence what you want to grow. With a clear intention, intensity turns into momentum.',
      },
      {
        headline: 'Embrace the change.',
        body: 'Something is transforming, even if you cannot tell what yet. You do not need to understand it all right now. Trust that you are in the middle of a process.',
      },
      {
        headline: 'Be honest with yourself.',
        body: 'It is hard to hide what you feel today, even from yourself. It is a good moment to admit a truth you have been avoiding. Naming it is the first step to healing it.',
      },
      {
        headline: 'Focus your power.',
        body: 'You have plenty of energy available, but scattered it goes nowhere. Pick one thing and give it your full attention. What you do with focus today leaves a mark.',
      },
      {
        headline: 'Mix the unexpected.',
        body: 'It is a day to combine things that rarely go together: logic and feeling, work and play. The best ideas come from unexpected crossings. Try something outside your habit.',
      },
      {
        headline: 'Stay present.',
        body: 'Emotions may feel amplified, the lovely ones and the hard ones. Do not rush them or judge them. Live them with attention, they carry valuable information.',
      },
      {
        headline: 'Refresh a habit.',
        body: 'Today’s intensity is a good ally for reinventing something ordinary. Change one small routine that no longer serves you. Simple things done differently can renew you.',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Sí / No del día                                                     */
/* ------------------------------------------------------------------ */

export const DO_DONT: L<{ do: string[]; dont: string[] }> = {
  es: {
    do: [
      'Agua tibia',
      'Notas a mano',
      'Cuarzo rosa',
      'Caminar sin destino',
      'Amatista',
      'Pan recién hecho',
      'Citrino',
      'Siestas cortas',
      'Pirita',
      'Cartas sin enviar',
      'Ojo de tigre',
      'Música instrumental',
      'Piedra luna',
      'Plantas en la ventana',
      'Turmalina negra',
      'Cornalina',
      'Lapislázuli',
      'Amazonita',
      'Mercados de barrio',
      'Té de manzanilla',
      'Bailar a solas',
      'Ventanas abiertas',
      'Libros usados',
      'Velas de cera',
      'Atardeceres',
      'Llamar a la abuela',
      'Calcetines suaves',
      'Fotos viejas',
      'Ordenar un cajón',
      'Mirar el mar',
      'Desayunos lentos',
      'Cielos nublados',
      'Flores secas',
      'Preguntas honestas',
    ],
    dont: [
      'Espacios pequeños',
      'Pueblos fantasma',
      'Discusiones a medianoche',
      'Correos en mayúsculas',
      'Promesas apuradas',
      'Café recalentado',
      'Chismes ajenos',
      'Grupos de WhatsApp',
      'Compras impulsivas',
      'Revisar el pasado',
      'Filas largas',
      'Relojes atrasados',
      'Ex en redes',
      'Dormir tarde',
      'Comparaciones',
      'Perfeccionismo',
      'Ruido de fondo',
      'Decisiones con hambre',
      'Tráfico en hora punta',
      'Zapatos apretados',
      'Excusas largas',
      'Pantallas en la cama',
      'Rencores viejos',
      'Notificaciones',
      'Luces fluorescentes',
      'Prisa',
      'Tazas sin lavar',
      'Planes sin pausa',
      'Mensajes ambiguos',
      'Pensar por otros',
      'Sobremesas eternas',
      'Contraseñas olvidadas',
    ],
  },
  en: {
    do: [
      'Warm water',
      'Handwritten notes',
      'Rose quartz',
      'Aimless walks',
      'Amethyst',
      'Fresh bread',
      'Citrine',
      'Short naps',
      'Pyrite',
      'Unsent letters',
      'Tiger’s eye',
      'Instrumental music',
      'Moonstone',
      'Windowsill plants',
      'Black tourmaline',
      'Carnelian',
      'Lapis lazuli',
      'Amazonite',
      'Local markets',
      'Chamomile tea',
      'Dancing alone',
      'Open windows',
      'Secondhand books',
      'Beeswax candles',
      'Sunsets',
      'Calling grandma',
      'Soft socks',
      'Old photos',
      'Tidying a drawer',
      'Watching the sea',
      'Slow breakfasts',
      'Cloudy skies',
      'Dried flowers',
      'Honest questions',
    ],
    dont: [
      'Small spaces',
      'Ghost towns',
      'Midnight arguments',
      'All-caps emails',
      'Rushed promises',
      'Reheated coffee',
      'Other people’s gossip',
      'Group chats',
      'Impulse buys',
      'Digging up the past',
      'Long lines',
      'Slow clocks',
      'Exes online',
      'Late nights',
      'Comparisons',
      'Perfectionism',
      'Background noise',
      'Hungry decisions',
      'Rush-hour traffic',
      'Tight shoes',
      'Long excuses',
      'Screens in bed',
      'Old grudges',
      'Notifications',
      'Fluorescent lights',
      'Hurry',
      'Unwashed mugs',
      'Nonstop plans',
      'Vague texts',
      'Thinking for others',
      'Endless dinners',
      'Forgotten passwords',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Frases de tránsito                                                  */
/* ------------------------------------------------------------------ */

export const TRANSIT_TEXT: Record<
  'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn',
  L<string>
> = {
  sun: { es: 'tu vitalidad y tus ganas de brillar', en: 'your vitality and your wish to shine' },
  moon: { es: 'tus emociones y tus necesidades', en: 'your emotions and your needs' },
  mercury: {
    es: 'las ideas, las conversaciones y los planes',
    en: 'ideas, conversations and plans',
  },
  venus: { es: 'el amor, el placer y lo que valoras', en: 'love, pleasure and what you value' },
  mars: { es: 'la acción, el deseo y la iniciativa', en: 'action, desire and initiative' },
  jupiter: { es: 'la confianza, el crecimiento y la suerte', en: 'confidence, growth and luck' },
  saturn: {
    es: 'la disciplina, los límites y la paciencia',
    en: 'discipline, limits and patience',
  },
};

export const NATAL_TEXT: Record<'sun' | 'moon' | 'ascendant' | 'venus' | 'mars', L<string>> = {
  sun: { es: 'tu esencia y tu energía', en: 'your core and your energy' },
  moon: { es: 'tu mundo emocional', en: 'your emotional world' },
  ascendant: { es: 'tu forma de mostrarte', en: 'the way you show yourself' },
  venus: { es: 'tu manera de amar', en: 'the way you love' },
  mars: { es: 'tu impulso y tu deseo', en: 'your drive and your desire' },
};

/* ------------------------------------------------------------------ */
/* Pregúntale al cielo                                                 */
/* ------------------------------------------------------------------ */

export const ASK_QUESTIONS: Record<AskTopic, { label: L<string>; questions: L<string[]> }> = {
  self: {
    label: { es: 'Tú', en: 'You' },
    questions: {
      es: [
        '¿Cómo puedo confiar más en mí?',
        '¿Qué necesito soltar ahora?',
        '¿Por qué me siento así hoy?',
        '¿Cómo encuentro más calma?',
        '¿Qué me da energía de verdad?',
        '¿Estoy en el camino correcto?',
        '¿Cómo puedo cuidarme mejor?',
        '¿Qué parte de mí pide atención?',
      ],
      en: [
        'How can I trust myself more?',
        'What do I need to let go of now?',
        'Why do I feel this way today?',
        'How do I find more calm?',
        'What truly gives me energy?',
        'Am I on the right path?',
        'How can I take better care of myself?',
        'What part of me needs attention?',
      ],
    },
  },
  love: {
    label: { es: 'Amor', en: 'Love' },
    questions: {
      es: [
        '¿Volveré a enamorarme?',
        '¿Esta relación me hace bien?',
        '¿Cómo puedo abrir mi corazón?',
        '¿Debería escribirle?',
        '¿Qué busco realmente en el amor?',
        '¿Cómo sano una ruptura?',
        '¿Cómo mejoro la comunicación con mi pareja?',
        '¿Es buen momento para algo serio?',
      ],
      en: [
        'Will I fall in love again?',
        'Is this relationship good for me?',
        'How can I open my heart?',
        'Should I text them?',
        'What am I really looking for in love?',
        'How do I heal after a breakup?',
        'How can I communicate better with my partner?',
        'Am I ready for something serious?',
      ],
    },
  },
  work: {
    label: { es: 'Trabajo', en: 'Work' },
    questions: {
      es: [
        '¿Debería cambiar de trabajo?',
        '¿Cómo encuentro mi vocación?',
        '¿Es buen momento para emprender?',
        '¿Cómo manejo a mi jefe?',
        '¿Cómo recupero la motivación?',
        '¿Debo pedir un ascenso?',
        '¿Cómo equilibro trabajo y descanso?',
        '¿Qué talento debería usar más?',
      ],
      en: [
        'Should I change jobs?',
        'How do I find my calling?',
        'Is it a good time to start a business?',
        'How do I handle my boss?',
        'How do I get my motivation back?',
        'Should I ask for a promotion?',
        'How do I balance work and rest?',
        'Which talent should I use more?',
      ],
    },
  },
  money: {
    label: { es: 'Dinero', en: 'Money' },
    questions: {
      es: [
        '¿Cómo mejoro mi relación con el dinero?',
        '¿Es buen momento para una compra grande?',
        '¿Por qué me cuesta ahorrar?',
        '¿Cómo dejo de preocuparme por el dinero?',
        '¿Merezco cobrar más?',
        '¿Cómo atraigo más abundancia?',
        '¿Debería prestar dinero?',
        '¿Qué me impide prosperar?',
      ],
      en: [
        'How can I improve my relationship with money?',
        'Is it a good time for a big purchase?',
        'Why is saving so hard for me?',
        'How do I stop worrying about money?',
        'Do I deserve to earn more?',
        'How do I invite more abundance?',
        'Should I lend money?',
        'What keeps me from thriving?',
      ],
    },
  },
};

export const ASK_ANSWERS: Record<AskTopic, Record<Nature, L<string[]>>> = {
  self: {
    flow: {
      es: [
        'Tu cielo de hoy te acompaña con suavidad. Es buen momento para escuchar lo que sientes sin apurarte a corregirlo. Lo que buscas empieza por darte permiso de ser como eres.',
        'Hay una energía amable a tu favor. Aprovéchala para hacer algo pequeño que te haga sentir orgullo. La confianza se construye con gestos simples, uno a la vez.',
        'Hoy tu intuición habla claro. Si una respuesta aparece rápido, no la descartes por ser sencilla. A veces ya sabes lo que necesitas, solo falta creerte.',
        'El ambiente invita a celebrarte. Haz una lista de tres cosas que hiciste bien esta semana. Llevar un Citrino contigo puede ser un recordatorio luminoso de tu propio valor.',
        'Todo fluye un poco mejor cuando te tratas con cariño. Regálate un momento de calma, sin pantallas. En ese silencio, lo que te preguntas encuentra su propio orden.',
      ],
      en: [
        'Today’s sky walks gently beside you. It is a good moment to listen to what you feel without rushing to fix it. What you are looking for begins with allowing yourself to be who you are.',
        'There is a kind energy on your side. Use it to do one small thing that makes you proud. Confidence is built with simple gestures, one at a time.',
        'Your intuition speaks clearly today. If an answer comes quickly, do not dismiss it for being simple. Sometimes you already know what you need, you just have to believe yourself.',
        'The mood invites you to celebrate yourself. Write down three things you did well this week. Carrying a Citrine can be a bright reminder of your own worth.',
        'Everything flows a little better when you treat yourself with care. Give yourself a calm moment, away from screens. In that quiet, your question finds its own order.',
      ],
    },
    tension: {
      es: [
        'Hoy puede haber ruido interno, y eso no significa que estés haciendo algo mal. Nota qué te incomoda sin juzgarlo. Lo que pide atención suele ser lo que más te enseña.',
        'Si te sientes en conflicto contigo, baja el ritmo. No tienes que resolverlo todo hoy. Respira, camina y deja que la respuesta llegue cuando haya más calma.',
        'La tensión de hoy invita a revisar un límite. Pregúntate dónde estás cediendo demasiado. Cuidarte también es decir que no.',
        'Puede que te exijas más de lo necesario. Háblate como le hablarías a alguien que quieres. Una Amatista cerca puede recordarte que la calma también es un camino.',
        'Las dudas se sienten más grandes en días como este. Escríbelas en un papel para verlas con distancia. Muchas pierden fuerza cuando dejan de dar vueltas en tu cabeza.',
      ],
      en: [
        'There may be inner noise today, and that does not mean you are doing anything wrong. Notice what bothers you without judging it. What asks for attention is often what teaches you most.',
        'If you feel at odds with yourself, slow down. You do not have to solve everything today. Breathe, walk and let the answer come when things are calmer.',
        'Today’s tension invites you to look at a boundary. Ask yourself where you are giving in too much. Caring for yourself also means saying no.',
        'You may be asking more of yourself than you need to. Speak to yourself as you would to someone you love. An Amethyst nearby can remind you that calm is also a path.',
        'Doubts feel bigger on days like this. Write them on paper to see them from a distance. Many of them lose strength once they stop circling in your head.',
      ],
    },
    blend: {
      es: [
        'Hoy se mezclan energías intensas en tu interior. Es buen momento para preguntarte qué quieres cultivar en esta etapa. La claridad llega cuando eliges una intención y la nombras.',
        'Algo en ti se está transformando. No necesitas entenderlo del todo para confiar en el proceso. Observa con curiosidad lo que cambia en tus gustos y tus ganas.',
        'Tu cielo pide honestidad contigo. Reconoce una emoción que venías evitando y dale un lugar. Lo que se mira con ternura deja de pesar tanto.',
        'La intensidad del día puede ser tu aliada si le das dirección. Elige una sola cosa que quieras para ti y dale tu atención. Una Piedra luna puede acompañarte como símbolo de tus ciclos.',
        'Hoy es fácil sentirlo todo a la vez. En lugar de ordenar cada emoción, simplemente obsérvalas. Tu respuesta está en lo que se repite, no en lo que grita más fuerte.',
      ],
      en: [
        'Intense energies blend within you today. It is a good moment to ask what you want to grow in this chapter. Clarity comes when you choose an intention and name it.',
        'Something in you is transforming. You do not need to fully understand it to trust the process. Watch with curiosity how your tastes and desires are shifting.',
        'Your sky asks for honesty with yourself. Acknowledge a feeling you have been avoiding and give it room. What is seen with tenderness weighs less.',
        'The day’s intensity can be your ally if you give it direction. Pick one thing you want for yourself and give it your attention. A Moonstone can be a symbol of your own cycles.',
        'It is easy to feel everything at once today. Instead of sorting every emotion, simply observe them. Your answer lives in what keeps returning, not in what shouts loudest.',
      ],
    },
  },
  love: {
    flow: {
      es: [
        'Tu cielo favorece la ternura. Es buen momento para expresar cariño sin esperar nada a cambio. El amor crece donde hay espacio para mostrarse tal cual.',
        'Hoy los vínculos fluyen con facilidad. Si tienes algo bonito que decir, dilo. Las palabras sencillas suelen llegar más hondo que los grandes gestos.',
        'El amor empieza por cómo te tratas. Regálate algo que te haga sentir en casa. Un Cuarzo rosa cerca puede recordarte que mereces un afecto amable.',
        'Hay una energía abierta y receptiva a tu alrededor. Permítete conocer, conversar y dejarte sorprender. No hace falta saber hacia dónde va algo para disfrutarlo.',
        'Hoy es fácil sentir gratitud por las personas que te acompañan. Fíjate en los pequeños detalles que te hacen bien. Agradecerlos fortalece cualquier vínculo.',
      ],
      en: [
        'Your sky favors tenderness. It is a good moment to show affection without expecting anything back. Love grows where there is room to be yourself.',
        'Connections flow easily today. If you have something kind to say, say it. Simple words often reach deeper than grand gestures.',
        'Love begins with how you treat yourself. Give yourself something that makes you feel cared for. A Rose quartz nearby can remind you that you deserve gentle affection.',
        'There is an open, receptive energy around you. Allow yourself to meet, talk and be surprised. You do not need to know where something is going to enjoy it.',
        'It is easy to feel grateful for the people beside you today. Notice the small things that do you good. Appreciating them strengthens any bond.',
      ],
    },
    tension: {
      es: [
        'Hoy las emociones en el amor pueden estar sensibles. Antes de reaccionar, pregúntate qué necesitas en realidad. A veces detrás del enojo hay una necesidad de cuidado.',
        'Si algo te inquieta en una relación, no lo resuelvas a medianoche. Espera a sentir más calma para conversar. Las palabras dichas con paciencia construyen puentes.',
        'La tensión de hoy invita a mirar tus patrones. Nota si repites algo que ya no te hace bien. Reconocerlo es el primer paso para elegir distinto.',
        'Puede que sientas distancia o malentendidos. Escucha más de lo que hablas. Llevar un Cuarzo rosa puede ser un recordatorio de tratar a tu corazón con suavidad.',
        'El amor también pide límites. Si estás dando más de lo que recibes, es buen momento para notarlo. Quererte bien es la base de cualquier vínculo sano.',
      ],
      en: [
        'Feelings in love may be tender today. Before reacting, ask yourself what you really need. Sometimes behind anger there is a need to be cared for.',
        'If something worries you in a relationship, do not settle it at midnight. Wait until you feel calmer to talk. Words spoken with patience build bridges.',
        'Today’s tension invites you to look at your patterns. Notice if you are repeating something that no longer serves you. Seeing it is the first step to choosing differently.',
        'You may feel distance or misunderstanding. Listen more than you speak. Carrying a Rose quartz can remind you to treat your heart gently.',
        'Love also asks for boundaries. If you are giving more than you receive, this is a good moment to notice it. Loving yourself well is the base of any healthy bond.',
      ],
    },
    blend: {
      es: [
        'Hoy el amor se siente intenso, en cualquier dirección. Es buen momento para preguntarte qué buscas de verdad en un vínculo. La respuesta honesta te acerca a lo que mereces.',
        'Algo en tu forma de amar está cambiando. Quizá ya no quieres lo mismo que antes, y está bien. Dale espacio a esa nueva versión de tu corazón.',
        'Las emociones profundas piden ser nombradas. Si sientes algo fuerte, escríbelo antes de decidir qué hacer con ello. La claridad llega cuando dejas de esconderlo.',
        'Tu cielo invita a mezclar ternura y valentía. Muéstrate un poco más de lo habitual. Una Piedra luna puede acompañarte como símbolo de tu sensibilidad.',
        'Hoy es un día para mirar el amor como un proceso, no como un resultado. Observa qué te nutre y qué te desgasta. Lo que elijas cultivar crecerá con tu atención.',
      ],
      en: [
        'Love feels intense today, in whatever direction. It is a good moment to ask what you truly want from a bond. An honest answer brings you closer to what you deserve.',
        'Something in the way you love is changing. Maybe you no longer want what you used to, and that is okay. Make room for this new version of your heart.',
        'Deep feelings ask to be named. If you feel something strong, write it down before deciding what to do with it. Clarity comes when you stop hiding it.',
        'Your sky invites you to blend tenderness with courage. Show a little more of yourself than usual. A Moonstone can be a symbol of your sensitivity.',
        'Today is a day to see love as a process, not a result. Notice what nourishes you and what wears you down. Whatever you choose to tend will grow with your attention.',
      ],
    },
  },
  work: {
    flow: {
      es: [
        'Tu cielo favorece la claridad y el avance. Es buen momento para retomar ese proyecto que te entusiasma. Da un paso concreto hoy, aunque sea pequeño.',
        'Hoy tus ideas encuentran eco. Si tienes una propuesta, compártela. La energía del día invita a mostrar lo que sabes hacer.',
        'El trabajo fluye mejor cuando conectas con lo que te gusta. Pregúntate qué parte de tu labor disfrutas más. Dale más espacio a eso.',
        'Hay una energía de colaboración a tu alrededor. Pide ayuda o ofrécela sin dudar. Un Ojo de tigre en tu escritorio puede ser un recordatorio de tu enfoque.',
        'Es buen momento para reconocer tu propio esfuerzo. Mira lo que has construido hasta ahora. La confianza en tu talento te abre caminos nuevos.',
      ],
      en: [
        'Your sky favors clarity and progress. It is a good moment to return to that project that excites you. Take one concrete step today, however small.',
        'Your ideas find an echo today. If you have a proposal, share it. The day’s energy invites you to show what you can do.',
        'Work flows better when you connect with what you enjoy. Ask yourself which part of your work you like most. Give that more room.',
        'There is a collaborative energy around you. Ask for help or offer it freely. A Tiger’s eye on your desk can be a reminder of your focus.',
        'It is a good moment to recognize your own effort. Look at what you have built so far. Trusting your talent opens new paths.',
      ],
    },
    tension: {
      es: [
        'Hoy el trabajo puede sentirse pesado o con roces. No tomes decisiones grandes desde el cansancio. Haz lo esencial y deja lo demás para un día más claro.',
        'Si hay conflicto con alguien, respira antes de responder. Escribe lo que quieres decir y reléelo con calma. La pausa protege tu energía y tus vínculos.',
        'La tensión de hoy invita a revisar tus prioridades. Quizá estás cargando con tareas que no te corresponden. Es buen momento para delegar o decir que no.',
        'Puede que sientas frustración por el ritmo de las cosas. Recuerda que avanzar despacio también es avanzar. Una Turmalina negra cerca puede ser un símbolo de protección y calma.',
        'Cuando todo parece urgente, nada lo es de verdad. Elige una sola tarea y termínala. Esa pequeña victoria te devuelve el control.',
      ],
      en: [
        'Work may feel heavy or tense today. Do not make big decisions from exhaustion. Handle the essentials and leave the rest for a clearer day.',
        'If there is conflict with someone, breathe before answering. Write what you want to say and reread it calmly. The pause protects your energy and your relationships.',
        'Today’s tension invites you to review your priorities. Maybe you are carrying tasks that are not yours. It is a good time to delegate or say no.',
        'You may feel frustrated by how slowly things move. Remember that moving slowly is still moving. A Black tourmaline nearby can be a symbol of protection and calm.',
        'When everything seems urgent, nothing truly is. Pick one task and finish it. That small win gives you back a sense of control.',
      ],
    },
    blend: {
      es: [
        'Hoy se mezclan ganas de cambio y necesidad de estabilidad. Escucha ambas voces sin elegir todavía. La mejor decisión suele integrar lo que las dos quieren.',
        'Tu cielo pide preguntarte para qué haces lo que haces. Más allá de la tarea, ¿qué te mueve? Esa respuesta puede orientar tu siguiente paso.',
        'La energía del día es intensa y creativa. Úsala para replantear algo que ya no funciona. A veces un pequeño cambio de enfoque transforma todo.',
        'Es buen momento para concentrar tu fuerza en un solo objetivo. La dispersión te agota, el foco te impulsa. Una Cornalina puede acompañarte como símbolo de iniciativa.',
        'Algo en tu camino profesional se está reacomodando. No necesitas tener todas las respuestas hoy. Observa qué te da energía y qué te la quita; ahí hay pistas.',
      ],
      en: [
        'A wish for change and a need for stability blend today. Listen to both voices without choosing yet. The best decision often honors what both want.',
        'Your sky asks you why you do what you do. Beyond the task, what moves you? That answer can guide your next step.',
        'The day’s energy is intense and creative. Use it to rethink something that no longer works. Sometimes a small shift in focus changes everything.',
        'It is a good moment to focus your strength on a single goal. Scattering drains you, focus drives you. A Carnelian can be a symbol of initiative.',
        'Something in your career path is rearranging itself. You do not need every answer today. Notice what gives you energy and what takes it away; there are clues there.',
      ],
    },
  },
  money: {
    flow: {
      es: [
        'Tu cielo favorece una relación tranquila con el dinero. Es buen momento para revisar tus cuentas sin miedo. Mirar los números con calma ya es un acto de cuidado.',
        'Hoy es fácil notar lo que ya tienes. Haz una lista de recursos, no solo de dinero: tiempo, talentos, personas. La abundancia empieza por reconocerla.',
        'La energía del día invita a ordenar. Organiza un gasto, una meta o un pequeño ahorro. Un Citrino cerca puede ser un recordatorio simbólico de prosperidad.',
        'Es buen momento para valorar tu trabajo. Pregúntate si lo que cobras refleja tu esfuerzo. Hablar de ello con claridad es parte de cuidarte.',
        'Hay una energía amable para planear. Piensa en algo que quieras lograr y divídelo en pasos pequeños. La constancia suele pesar más que la suerte.',
      ],
      en: [
        'Your sky favors a calm relationship with money. It is a good moment to review your accounts without fear. Looking at the numbers calmly is already an act of care.',
        'It is easy to notice what you already have today. List your resources, not only money: time, talents, people. Abundance begins with recognizing it.',
        'The day’s energy invites you to get organized. Sort out one expense, one goal or one small saving. A Citrine nearby can be a symbolic reminder of prosperity.',
        'It is a good moment to value your work. Ask yourself whether what you earn reflects your effort. Talking about it clearly is part of caring for yourself.',
        'There is a kind energy for planning. Think of something you want to achieve and break it into small steps. Consistency often matters more than luck.',
      ],
    },
    tension: {
      es: [
        'Hoy el dinero puede despertar ansiedad. No tomes decisiones grandes desde el miedo. Respira, revisa los hechos y deja la decisión para cuando estés en calma.',
        'La tensión de hoy invita a mirar tus impulsos. Antes de comprar algo, pregúntate qué emoción lo motiva. A veces buscamos llenar con cosas lo que pide otra atención.',
        'Si sientes presión económica, empieza por lo que sí controlas. Un pequeño ajuste hoy vale más que una gran preocupación. Paso a paso se recupera la claridad.',
        'Puede que te compares con otras personas. Recuerda que cada camino tiene su propio ritmo. Una Pirita en tu espacio puede ser un recordatorio de tu propia fuerza.',
        'Es buen momento para revisar un límite: prestar, gastar o comprometerte. Decir que no también protege tu tranquilidad. Cuidar tus recursos es cuidarte.',
      ],
      en: [
        'Money may stir up anxiety today. Do not make big decisions from fear. Breathe, check the facts and leave the decision for when you feel calm.',
        'Today’s tension invites you to look at your impulses. Before buying something, ask which feeling is behind it. Sometimes we fill with things what needs a different kind of care.',
        'If you feel financial pressure, start with what you can control. A small adjustment today is worth more than a big worry. Step by step, clarity returns.',
        'You may be comparing yourself with others. Remember that every path has its own pace. A Pyrite in your space can be a reminder of your own strength.',
        'It is a good moment to review a boundary: lending, spending or committing. Saying no also protects your peace. Caring for your resources is caring for yourself.',
      ],
    },
    blend: {
      es: [
        'Hoy se mezclan ganas de crecer y necesidad de seguridad. Escucha ambas antes de decidir. Un plan equilibrado honra lo que sueñas y lo que necesitas.',
        'Tu cielo invita a revisar tus creencias sobre el dinero. ¿Qué aprendiste en tu infancia sobre ganar o gastar? Notarlo puede liberarte de un patrón antiguo.',
        'La energía del día es buena para transformar un hábito. Elige uno pequeño, como anotar tus gastos, y empieza hoy. Lo simple sostenido cambia mucho.',
        'Es buen momento para enfocarte en el valor, no solo en el precio. Pregúntate qué te aporta de verdad aquello en lo que inviertes tu dinero. Un Ojo de tigre puede acompañarte como símbolo de decisiones claras.',
        'Algo en tu relación con los recursos se está reacomodando. Observa sin juzgar qué te da tranquilidad y qué te inquieta. Esa información es tu mejor guía.',
      ],
      en: [
        'A wish to grow and a need for security blend today. Listen to both before deciding. A balanced plan honors what you dream of and what you need.',
        'Your sky invites you to look at your beliefs about money. What did you learn as a child about earning or spending? Noticing it can free you from an old pattern.',
        'Today’s energy is good for transforming a habit. Pick a small one, like writing down your expenses, and start today. Simple things, sustained, change a lot.',
        'It is a good moment to focus on value, not just price. Ask what the things you spend on truly bring you. A Tiger’s eye can be a symbol of clear decisions.',
        'Something in your relationship with resources is rearranging itself. Notice without judging what brings you calm and what unsettles you. That information is your best guide.',
      ],
    },
  },
};
