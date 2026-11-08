import { type LocaleCode } from '@antrina/contracts';

/** Textos de la interfaz de "Tu cielo" (navegación, pasos y pantallas). */
export interface SkyUi {
  nav: { today: string; chart: string; ask: string; bonds: string; stones: string };
  guide: string;
  close: string;
  skip: string;
  nextSlide: string;
  startNow: string;
  dateTitle: string;
  dataNote: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  timeTitle: string;
  noTime: string;
  placeTitle: string;
  placeHolder: string;
  placeNote: string;
  placeSkip: string;
  searching: string;
  noResults: string;
  revealNote: string;
  continue: string;
  back: string;
  glance: string;
  do: string;
  dont: string;
  transitTitle: string;
  transiting: string;
  toYour: string;
  natal: string;
  noTransit: string;
  moonToday: string;
  deeper: string;
  whatMeans: string;
  signs: string;
  planets: string;
  houses: string;
  settings: string;
  noHouses: string;
  addPlace: string;
  retro: string;
  inSign: string;
  inHouse: string;
  askTitle: string;
  askPlaceholder: string;
  askCta: string;
  youAsked: string;
  thinking: string;
  helpful: string;
  thanks: string;
  dismiss: string;
  history: string;
  stoneHint: string;
  settingsDate: string;
  settingsTime: string;
  settingsPlace: string;
  houseSystem: string;
  porphyry: string;
  unknown: string;
  replayIntro: string;
  done: string;
}

export const SKY_UI: Record<LocaleCode, SkyUi> = {
  es: {
    nav: { today: 'Hoy', chart: 'Carta', ask: 'Pregunta', bonds: 'Vínculos', stones: 'Tienda' },
    guide: 'Guía',
    close: 'Cerrar',
    skip: 'Saltar',
    nextSlide: 'Siguiente',
    startNow: 'Crear mi carta',
    dateTitle: '¿Cuándo naciste?',
    dataNote: 'Lo usamos solo para calcular tu carta natal. Se guarda en este dispositivo.',
    day: 'Día',
    month: 'Mes',
    year: 'Año',
    hour: 'Hora',
    minute: 'Minuto',
    timeTitle: '¿A qué hora naciste?',
    noTime: 'No sé la hora',
    placeTitle: '¿Dónde naciste?',
    placeHolder: 'Ciudad',
    placeNote:
      'Con tu ciudad calculamos tu ascendente y tus casas. Buscamos la ciudad en Open-Meteo; solo enviamos el texto que escribes.',
    placeSkip: 'Omitir por ahora',
    searching: 'Buscando…',
    noResults: 'No encontramos esa ciudad. Prueba con otra forma de escribirla.',
    revealNote:
      'Calculamos tu carta con posiciones astronómicas reales del día y la hora en que naciste.',
    continue: 'Continuar',
    back: 'Atrás',
    glance: 'Tu día de un vistazo',
    do: 'Haz',
    dont: 'Evita',
    transitTitle: 'El tránsito del día',
    transiting: 'en tránsito',
    toYour: 'a tu',
    natal: 'natal',
    noTransit: 'Hoy el cielo está tranquilo para ti: ningún planeta toca de cerca tu carta.',
    moonToday: 'La Luna hoy está en',
    deeper: 'Profundizar',
    whatMeans: '¿Qué significa?',
    signs: 'Signos',
    planets: 'Planetas',
    houses: 'Casas',
    settings: 'Ajustes',
    noHouses: 'Agrega tu hora y ciudad de nacimiento para ver tu ascendente y tus casas.',
    addPlace: 'Agregar mi ciudad',
    retro: 'retrógrado',
    inSign: 'en',
    inHouse: 'en tu casa',
    askTitle: 'Pregunta al cielo',
    askPlaceholder: 'Pregunta lo que quieras…',
    askCta: 'Preguntar',
    youAsked: 'Preguntaste',
    thinking: 'Desde entonces, los planetas no han dejado de moverse…',
    helpful: '¿Te sirvió esta respuesta?',
    thanks: 'Gracias por contarnos.',
    dismiss: 'Cerrar',
    history: 'Tus preguntas',
    stoneHint: 'Te acompaña',
    settingsDate: 'Fecha de nacimiento',
    settingsTime: 'Hora de nacimiento',
    settingsPlace: 'Lugar de nacimiento',
    houseSystem: 'Sistema de casas',
    porphyry: 'Porfirio',
    unknown: 'Sin indicar',
    replayIntro: 'Ver la guía de inicio',
    done: 'Listo',
  },
  en: {
    nav: { today: 'Today', chart: 'Chart', ask: 'Ask', bonds: 'Bonds', stones: 'Shop' },
    guide: 'Guide',
    close: 'Close',
    skip: 'Skip',
    nextSlide: 'Next',
    startNow: 'Create my chart',
    dateTitle: 'When were you born?',
    dataNote: 'We only use this to calculate your birth chart. It stays on this device.',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    hour: 'Hour',
    minute: 'Minute',
    timeTitle: 'What time were you born?',
    noTime: "I don't know the time",
    placeTitle: 'Where were you born?',
    placeHolder: 'City',
    placeNote:
      'Your city lets us calculate your rising sign and houses. We look it up on Open-Meteo; only the text you type is sent.',
    placeSkip: 'Skip for now',
    searching: 'Searching…',
    noResults: "We couldn't find that city. Try another spelling.",
    revealNote:
      'We calculate your chart from the real astronomical positions of the day and time you were born.',
    continue: 'Continue',
    back: 'Back',
    glance: 'Your day at a glance',
    do: 'Do',
    dont: "Don't",
    transitTitle: "Today's transit",
    transiting: 'transiting',
    toYour: 'to your',
    natal: 'natal',
    noTransit: 'The sky is quiet for you today: no planet closely touches your chart.',
    moonToday: 'Today the Moon is in',
    deeper: 'Dive deeper',
    whatMeans: 'What does it mean?',
    signs: 'Signs',
    planets: 'Planets',
    houses: 'Houses',
    settings: 'Settings',
    noHouses: 'Add your birth time and city to see your rising sign and houses.',
    addPlace: 'Add my city',
    retro: 'retrograde',
    inSign: 'in',
    inHouse: 'in your house',
    askTitle: 'Ask the sky',
    askPlaceholder: 'Ask anything…',
    askCta: 'Ask',
    youAsked: 'You asked',
    thinking: 'Since then, the planets have never stopped moving…',
    helpful: 'Was this answer helpful?',
    thanks: 'Thank you for telling us.',
    dismiss: 'Dismiss',
    history: 'Your questions',
    stoneHint: 'Your companion',
    settingsDate: 'Birth date',
    settingsTime: 'Birth time',
    settingsPlace: 'Birth place',
    houseSystem: 'House system',
    porphyry: 'Porphyry',
    unknown: 'Not set',
    replayIntro: 'Replay the intro guide',
    done: 'Done',
  },
};
