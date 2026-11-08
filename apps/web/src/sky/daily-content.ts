import { type LocaleCode } from '@antrina/contracts';

/**
 * Textos del ranking diario, la "galleta de cuarzo" (papel de la fortuna) y los rituales. Tono de
 * tradición y cuidado: invitan, no prometen. Inspirado en el ranking de 12 signos de la TV japonesa
 * (frase, color y objeto de la suerte) y en las omikuji con cristal de Shiba Daijingu (Tokio).
 */
type L<T> = Record<LocaleCode, T>;

/** Frases por tramo del ranking: 1–3 (luz), 4–9 (camino), 10–12 (calma). */
export const RANK_PHRASES: Record<'high' | 'mid' | 'low', L<string[]>> = {
  high: {
    es: [
      'El cielo te abre la puerta: hoy conviene pedir, proponer o empezar.',
      'Tu energía brilla y se contagia: comparte una idea que guardabas.',
      'Las cosas fluyen a tu favor; confía en tu primer impulso.',
      'Día de encuentros felices: di que sí a esa invitación.',
      'Tienes viento a favor: da ese paso que venías postergando.',
      'Hoy tu palabra tiene peso: es buen momento para conversar lo importante.',
    ],
    en: [
      'The sky opens the door: today is good for asking, proposing or starting.',
      'Your energy shines and spreads: share an idea you were saving.',
      'Things flow your way; trust your first instinct.',
      'A day for happy encounters: say yes to that invitation.',
      'You have a tailwind: take the step you kept postponing.',
      'Your words carry weight today: a good moment for important talks.',
    ],
  },
  mid: {
    es: [
      'Un día parejo: avanza paso a paso y celebra lo pequeño.',
      'Ordena una cosa pendiente y sentirás el día más liviano.',
      'Escucha antes de responder: ahí está tu ventaja de hoy.',
      'Buen día para cuidar lo que ya tienes y agradecerlo.',
      'Una conversación sincera puede aclarar más de lo que crees.',
      'Haz espacio para algo que disfrutes, aunque sean diez minutos.',
    ],
    en: [
      'A steady day: move step by step and celebrate the small things.',
      'Tidy one pending task and the day will feel lighter.',
      'Listen before you answer: that is your edge today.',
      'A good day to care for what you have and be grateful for it.',
      'An honest conversation can clear up more than you think.',
      'Make room for something you enjoy, even ten minutes.',
    ],
  },
  low: {
    es: [
      'Hoy no es día de decisiones grandes: tómalo con calma, toma agua y duerme temprano.',
      'El cielo pide pausa: baja el ritmo y no te exijas de más.',
      'Si algo se complica, respira antes de responder: mañana se ve más claro.',
      'Día para recargar: menos pantalla, más descanso y una comida rica.',
      'Guarda tu energía para lo esencial y deja lo demás para mañana.',
      'Sé amable contigo: un día lento también es parte del camino.',
    ],
    en: [
      'Not a day for big decisions: take it easy, drink water and sleep early.',
      'The sky asks for a pause: slow down and do not push yourself too hard.',
      'If something gets complicated, breathe before you answer: tomorrow looks clearer.',
      'A day to recharge: less screen, more rest and a good meal.',
      'Save your energy for what matters and leave the rest for tomorrow.',
      'Be kind to yourself: a slow day is part of the path too.',
    ],
  },
};

/** Colores de la suerte (nombre + tono para la muestra). */
export const LUCKY_COLORS: { hex: string; name: L<string> }[] = [
  { hex: '#e9b949', name: { es: 'Dorado miel', en: 'Honey gold' } },
  { hex: '#f2b8c6', name: { es: 'Rosa cuarzo', en: 'Rose quartz' } },
  { hex: '#a07bd6', name: { es: 'Lila amatista', en: 'Amethyst lilac' } },
  { hex: '#3557a8', name: { es: 'Azul noche', en: 'Night blue' } },
  { hex: '#4fae6a', name: { es: 'Verde jade', en: 'Jade green' } },
  { hex: '#c4553a', name: { es: 'Terracota', en: 'Terracotta' } },
  { hex: '#f1eadf', name: { es: 'Blanco hueso', en: 'Bone white' } },
  { hex: '#9fc4ea', name: { es: 'Celeste cielo', en: 'Sky blue' } },
  { hex: '#e0662f', name: { es: 'Naranja fuego', en: 'Fire orange' } },
  { hex: '#3fb5b0', name: { es: 'Turquesa', en: 'Turquoise' } },
  { hex: '#7d7d8c', name: { es: 'Gris plata', en: 'Silver grey' } },
  { hex: '#e0457b', name: { es: 'Fucsia', en: 'Fuchsia' } },
];

/** Objetos de la suerte (como en el ranking de la TV japonesa). */
export const LUCKY_ITEMS: L<string[]> = {
  es: [
    'Una libreta pequeña',
    'Algo dorado',
    'Una taza de té caliente',
    'Una vela encendida',
    'Una planta cerca',
    'Tu canción favorita',
    'Un perfume suave',
    'Una carta escrita a mano',
    'Un pañuelo de color',
    'Una fruta cítrica',
    'Una foto que te haga sonreír',
    'Un libro abierto',
    'Una pulsera',
    'Flores frescas',
    'Un llavero especial',
    'Un cuaderno nuevo',
  ],
  en: [
    'A small notebook',
    'Something golden',
    'A cup of hot tea',
    'A lit candle',
    'A plant nearby',
    'Your favourite song',
    'A soft perfume',
    'A handwritten note',
    'A coloured scarf',
    'A citrus fruit',
    'A photo that makes you smile',
    'An open book',
    'A bracelet',
    'Fresh flowers',
    'A special keychain',
    'A new notebook',
  ],
};

/** Mensajes especiales por puesto (además de la frase). */
export const RANK_NOTE = {
  first: {
    es: 'Hoy tienes luz: aprovecha para pedir, proponer o empezar.',
    en: 'You have light today: use it to ask, propose or begin.',
  },
  podium: {
    es: 'Estás en el podio: comparte tu buena energía con alguien.',
    en: 'You are on the podium: share your good energy with someone.',
  },
  rescue: {
    es: 'Tu piedra te acompaña: haz el ritual de calma de 30 segundos.',
    en: 'Your stone is with you: try the 30-second calm ritual.',
  },
} as const;

/** Niveles de luz del papel de la fortuna (sin "mala suerte"). */
export const FORTUNE_LEVELS = ['great', 'good', 'serene', 'awakening'] as const;
export type FortuneLevel = (typeof FORTUNE_LEVELS)[number];

export const FORTUNE_LEVEL_LABEL: Record<FortuneLevel, L<string>> = {
  great: { es: 'Gran luz', en: 'Great light' },
  good: { es: 'Buena luz', en: 'Good light' },
  serene: { es: 'Luz serena', en: 'Serene light' },
  awakening: { es: 'Luz que despierta', en: 'Awakening light' },
};

/** Versos breves por nivel (el papel que sale del cuarzo). */
export const FORTUNE_VERSES: Record<FortuneLevel, L<string[]>> = {
  great: {
    es: [
      'Lo que siembras con calma florece sin prisa. Hoy, algo empieza a abrirse.',
      'La puerta que esperabas ya tiene la llave puesta: solo gírala.',
      'Una buena noticia viaja hacia ti; recíbela con las manos abiertas.',
      'Tu luz llega lejos hoy: alguien la está esperando.',
    ],
    en: [
      'What you sow with calm blooms without hurry. Today, something begins to open.',
      'The door you were waiting for already has the key in it: just turn it.',
      'Good news is on its way to you; receive it with open hands.',
      'Your light reaches far today: someone is waiting for it.',
    ],
  },
  good: {
    es: [
      'Como el agua que rodea la piedra, encontrarás el camino suave.',
      'Una sonrisa a tiempo cambia el color de todo el día.',
      'Lo pequeño que haces hoy sostiene lo grande de mañana.',
      'Confía en tu ritmo: no es lento, es tuyo.',
    ],
    en: [
      'Like water around a stone, you will find the gentle way.',
      'A timely smile changes the colour of the whole day.',
      'The small things you do today hold up the big things tomorrow.',
      'Trust your rhythm: it is not slow, it is yours.',
    ],
  },
  serene: {
    es: [
      'No todo se resuelve hoy, y está bien. La raíz crece en silencio.',
      'Respira hondo: la calma también es una forma de avanzar.',
      'Lo que hoy parece quieto se está preparando para moverse.',
      'Cuida tu energía como cuidas una llama: con suavidad.',
    ],
    en: [
      'Not everything is solved today, and that is fine. Roots grow in silence.',
      'Breathe deeply: calm is also a way of moving forward.',
      'What seems still today is getting ready to move.',
      'Tend your energy as you would a flame: gently.',
    ],
  },
  awakening: {
    es: [
      'Después de la noche más larga, la luz siempre regresa. Hoy, empieza de nuevo.',
      'Una pausa no es un final: es el lugar donde se juntan las fuerzas.',
      'Suelta lo que pesa; tus manos necesitan espacio para recibir.',
      'El cuarzo se forma lento y por eso es fuerte. Tú también.',
    ],
    en: [
      'After the longest night, the light always returns. Today, begin again.',
      'A pause is not an ending: it is where strength gathers.',
      'Let go of what weighs on you; your hands need room to receive.',
      'Quartz forms slowly, and that is why it is strong. So are you.',
    ],
  },
};

export const DAILY_UI = {
  es: {
    ritualTitle: 'Tu ritual de hoy',
    streak: (n: number) => (n === 1 ? '1 día seguido' : `${n} días seguidos`),
    streakGoal: (left: number) =>
      left === 0
        ? 'Desbloqueaste el Cuarzo cristal maestro'
        : `${left} ${left === 1 ? 'día' : 'días'} más para el Cuarzo cristal maestro`,
    steps: { ranking: 'Ranking del día', fortune: 'Galleta de cuarzo', ritual: 'Ritual de luz' },
    open: 'Abrir',
    again: 'Ver de nuevo',
    rankingTitle: 'Ranking de hoy',
    rankingToday: (sign: string, pos: number) => `Hoy ${sign} va ${pos}.°`,
    seeRanking: 'Ver el ranking completo',
    reveal: 'Revelando el cielo de hoy…',
    yours: 'Tu signo',
    luckyColor: 'Color',
    luckyNumber: 'Número',
    luckyHour: 'Hora',
    luckyItem: 'Objeto de la suerte',
    stoneOfDay: 'Piedra del día',
    share: 'Compartir',
    shared: 'Imagen lista para compartir',
    publicLink: 'Ver la página del ranking',
    indicesTitle: 'Tu energía de hoy',
    areas: { love: 'Amor', money: 'Dinero', work: 'Trabajo', energy: 'Energía' },
    ally: 'Tu aliado de hoy',
    allyText: (sign: string) => `Hoy fluyes especialmente bien con ${sign}.`,
    compare: 'Comparar en Vínculos',
    fortuneTitle: 'Tu galleta de cuarzo',
    fortuneHint: 'Toca el cuarzo para romperlo y leer tu papel de hoy.',
    fortuneAgain: 'Tu papel de hoy',
    fortuneStone: 'Te acompaña',
    collection: 'Tu colección de piedras',
    collectionHint: (n: number, total: number) => `${n} de ${total} piedras encontradas`,
    times: (n: number) => (n === 1 ? '1 vez' : `${n} veces`),
    master: 'Cuarzo cristal maestro',
    masterHint: 'Se gana con 7 días seguidos',
    ritualOpen: (stone: string) => `Ritual de luz con ${stone}`,
    ritualSteps: [
      'Sostén tu piedra (o imagínala) entre las manos.',
      'Respira con el círculo: entra el aire, sale el aire.',
      'Escribe en una frase lo que quieres para hoy.',
    ],
    breatheIn: 'Inhala',
    breatheOut: 'Exhala',
    intentionPlaceholder: 'Hoy quiero…',
    finish: 'Terminar ritual',
    next: 'Siguiente',
    ritualDone: 'Ritual hecho. Tu luz de hoy creció.',
    lightToday: 'Tu luz de hoy',
    disclaimer:
      'El ranking se calcula con el cielo real del día y es igual para todos. Es tradición y juego: úsalo como inspiración, no como certeza.',
  },
  en: {
    ritualTitle: 'Your ritual today',
    streak: (n: number) => (n === 1 ? '1 day in a row' : `${n} days in a row`),
    streakGoal: (left: number) =>
      left === 0
        ? 'You unlocked the Master clear quartz'
        : `${left} more ${left === 1 ? 'day' : 'days'} for the Master clear quartz`,
    steps: { ranking: "Today's ranking", fortune: 'Quartz fortune', ritual: 'Light ritual' },
    open: 'Open',
    again: 'See again',
    rankingTitle: "Today's ranking",
    rankingToday: (sign: string, pos: number) => `${sign} is #${pos} today`,
    seeRanking: 'See the full ranking',
    reveal: "Revealing today's sky…",
    yours: 'Your sign',
    luckyColor: 'Colour',
    luckyNumber: 'Number',
    luckyHour: 'Hour',
    luckyItem: 'Lucky item',
    stoneOfDay: 'Stone of the day',
    share: 'Share',
    shared: 'Image ready to share',
    publicLink: 'See the ranking page',
    indicesTitle: 'Your energy today',
    areas: { love: 'Love', money: 'Money', work: 'Work', energy: 'Energy' },
    ally: 'Your ally today',
    allyText: (sign: string) => `Today you flow especially well with ${sign}.`,
    compare: 'Compare in Bonds',
    fortuneTitle: 'Your quartz fortune',
    fortuneHint: "Tap the quartz to crack it and read today's paper.",
    fortuneAgain: "Today's paper",
    fortuneStone: 'With you',
    collection: 'Your stone collection',
    collectionHint: (n: number, total: number) => `${n} of ${total} stones found`,
    times: (n: number) => (n === 1 ? 'once' : `${n} times`),
    master: 'Master clear quartz',
    masterHint: 'Earned with a 7-day streak',
    ritualOpen: (stone: string) => `Light ritual with ${stone}`,
    ritualSteps: [
      'Hold your stone (or picture it) between your hands.',
      'Breathe with the circle: air in, air out.',
      'Write in one sentence what you want for today.',
    ],
    breatheIn: 'Breathe in',
    breatheOut: 'Breathe out',
    intentionPlaceholder: 'Today I want…',
    finish: 'Finish ritual',
    next: 'Next',
    ritualDone: 'Ritual done. Your light grew today.',
    lightToday: 'Your light today',
    disclaimer:
      "The ranking is calculated from the day's real sky and is the same for everyone. It is tradition and play: use it as inspiration, not certainty.",
  },
} as const;
