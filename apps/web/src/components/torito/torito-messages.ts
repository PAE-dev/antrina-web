/**
 * Un mensaje distinto cada día para cada torito: es la razón para volver a visitarlo.
 * Tono cercano y de acompañamiento; nunca promesas de salud, dinero ni resultados.
 */
const MESSAGES: readonly string[] = [
  'Hoy no tienes que poder con todo. Con dar un paso ya es bastante.',
  'Las montañas tampoco se hicieron en un día. Ve con calma.',
  'Respira hondo. Aquí en el establo todo puede esperar un momento.',
  '¿Qué fue lo mejor de ayer? Yo lo guardo contigo.',
  'Hoy elige una sola cosa importante y hazla con cariño.',
  'Me armaron piedra por piedra. A ti también te está tomando su tiempo, y está bien.',
  'Si hoy pesa, no pasa nada. Mañana volvemos a empezar.',
  'Escríbele hoy a alguien que hace tiempo no ves. Le va a alegrar.',
  'Mira por la ventana un minuto. Las cosas pequeñas también cuentan.',
  'Lo que estás construyendo no se ve todavía, pero ya está echando raíces.',
  'Hoy date las gracias por algo. Yo empiezo: gracias por venir a verme.',
  'No tienes que tenerlo claro todo. Basta con saber el siguiente paso.',
  'Hay días de sembrar y días de cosechar. Los dos valen.',
  'Sal a caminar aunque sea un ratito. Yo cuido el establo.',
  'Di que no a una cosa hoy. También eso es cuidarte.',
  'Te estaba esperando. Me alegra que hayas pasado por aquí.',
  'Termina hoy esa cosa pequeña que llevas días aplazando. Luego me cuentas.',
  'Cada línea que me pintaron tiene su historia. La tuya también vale la pena.',
  'Hoy intenta hablarte como le hablarías a un buen amigo.',
  'Ríete de algo hoy. Si no se te ocurre nada, mírame las orejas.',
  'Recuerda por qué empezaste. Esa razón sigue ahí.',
  'Un día tranquilo no es un día perdido.',
  'Ordena un solo rincón hoy. Se nota más de lo que parece.',
  'Agradece a alguien por algo pequeño. Es lo que más se recuerda.',
  'Lo estás haciendo mejor de lo que crees.',
  'Bebe un poco de agua, estira los hombros y vuelve a lo tuyo.',
  'Hoy mira algo que te guste sin apuro. Yo miro las montañas contigo.',
  'Las raíces crecen sin hacer ruido. Sigue, aunque hoy no lo notes.',
  'Pregúntale a alguien cómo está de verdad, y quédate a escuchar.',
  'Hoy no hace falta correr. Llegaremos igual.',
];

/** Preguntas para volver sobre la intención de cada uno. */
const INTENTION_PROMPTS: readonly string[] = [
  '¿Qué paso pequeño puedes dar hoy por esto?',
  '¿Qué te acercó ayer a esto, aunque fuera un poco?',
  '¿Quién podría echarte una mano con esto?',
  'No hace falta resolverlo todo hoy. ¿Qué parte puedes avanzar?',
  '¿Por qué te importa tanto? Recuérdalo un momento.',
  '¿Qué te está frenando hoy? Solo míralo, sin apuro.',
  '¿Qué harías hoy si confiaras un poco más en ti?',
  '¿Sigue siendo esto lo que quieres? Puedes cambiarlo cuando quieras.',
  '¿Qué podrías dejar de hacer hoy para tener más espacio para esto?',
  'Mira cuánto has avanzado desde que lo escribiste. ¿Qué notas?',
];

const LIMA_TIME_ZONE = 'America/Lima';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha de hoy en Lima como `AAAA-MM-DD`: el mensaje cambia a medianoche allí. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TIME_ZONE }).format(now);
}

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (Math.imul(value, 31) + (char.codePointAt(0) ?? 0)) >>> 0;
  return value;
}

/** Cada torito recorre todos los mensajes en su propio orden, sin repetir hasta terminarlos. */
export function messageOfTheDay(pieceId: string, date = todayKey()): string {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
  return MESSAGES[(hash(pieceId) + dayNumber) % MESSAGES.length]!;
}

export function intentionPromptOfTheDay(pieceId: string, date = todayKey()): string {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
  return INTENTION_PROMPTS[(hash(pieceId) + dayNumber) % INTENTION_PROMPTS.length]!;
}
