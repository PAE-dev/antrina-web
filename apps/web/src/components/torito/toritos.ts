import {
  type ToritoColorCode,
  type ToritoDto,
  type ToritoGiftDto,
  type ToritoPersonalityCode,
  TORITO_LIMITS,
} from '@antrina/contracts';
import { type ToritoTemperament } from './torito-renderer';

export interface Personality {
  id: ToritoPersonalityCode;
  /** Nombre sugerido; cada dueño pone el suyo. */
  name: string;
  trait: string;
  story: string;
  /** Lo que dice su globo al saludar en el establo. */
  hello: (name: string) => string;
  /** Lo que se cuenta al tocarlo cuando acaba de nacer. */
  greeting: (name: string) => string;
  temperament: ToritoTemperament;
}

/** Tres ejemplos: el real se asignará a cada pieza al crear su QR. Se elige con `?t=1`, `2` o `3`. */
export const PERSONALITIES: readonly Personality[] = [
  {
    id: 'inti',
    name: 'Inti',
    trait: 'Curioso y soñador',
    story: 'Nació mirando las montañas. Le gusta seguir con los ojos todo lo que se mueve.',
    hello: (name) => `¡Hola! Soy ${name}. ¿Qué miramos hoy?`,
    greeting: (name) => `${name} te mira con curiosidad.`,
    temperament: { blinkEvery: 3.4, liveliness: 1, earEvery: 6 },
  },
  {
    id: 'killa',
    name: 'Killa',
    trait: 'Tranquilo y observador',
    story: 'No tiene prisa. Se queda quieto escuchando la brisa entre las hojas.',
    hello: (name) => `Hola… soy ${name}. Qué bueno verte por aquí.`,
    greeting: (name) => `${name} parpadea despacio y te saluda.`,
    temperament: { blinkEvery: 5.2, liveliness: 0.55, earEvery: 9 },
  },
  {
    id: 'wayra',
    name: 'Wayra',
    trait: 'Inquieto y juguetón',
    story: 'Mueve las orejas por todo y siempre parece a punto de echar a correr.',
    hello: (name) => `¡Hola, hola! ¡Soy ${name}! ¿Jugamos?`,
    greeting: (name) => `${name} mueve las orejas de alegría.`,
    temperament: { blinkEvery: 2.5, liveliness: 1.5, earEvery: 3.2 },
  },
];

export interface ToritoColor {
  id: ToritoColorCode;
  label: string;
  /** Color del cuerpo de 0 a 1; `null` deja el rojo original de la ilustración. */
  rgb: readonly [number, number, number] | null;
  swatch: string;
}

/** Los colores en los que se venden los toritos. */
export const TORITO_COLORS: readonly ToritoColor[] = [
  { id: 'rojo', label: 'Rojo', rgb: null, swatch: '#c4502b' },
  { id: 'negro', label: 'Negro', rgb: [0.1, 0.1, 0.12], swatch: '#201f24' },
  { id: 'azul', label: 'Azul', rgb: [0.11, 0.25, 0.62], swatch: '#1f4099' },
  { id: 'amarillo', label: 'Amarillo', rgb: [0.88, 0.62, 0.1], swatch: '#e09e1a' },
  { id: 'verde', label: 'Verde', rgb: [0.13, 0.44, 0.25], swatch: '#217040' },
  { id: 'morado', label: 'Morado', rgb: [0.38, 0.17, 0.53], swatch: '#612b87' },
];

export const NAME_MAX_LENGTH = TORITO_LIMITS.name;
export const INTENTION_MAX_LENGTH = TORITO_LIMITS.intention;
export const GIFT_NAME_MAX_LENGTH = TORITO_LIMITS.giftName;
export const GIFT_MESSAGE_MAX_LENGTH = TORITO_LIMITS.giftMessage;

export const INTENTION_SUGGESTIONS: readonly string[] = [
  'Terminar lo que empecé',
  'Cuidar a los míos',
  'Tener más calma',
  'Empezar de nuevo',
  'Cuidar mi dinero',
];

/** Sin `*`, que en los títulos sirve para resaltar. */
export const cleanText = (text: string, maxLength: number) =>
  text.replaceAll('*', '').trim().slice(0, maxLength);

export const cleanToritoName = (name: string) => cleanText(name, NAME_MAX_LENGTH);

const DEFAULT_COLOR = TORITO_COLORS[0]!;
const colorById = (id: unknown) => TORITO_COLORS.find((color) => color.id === id) ?? DEFAULT_COLOR;

export const personalityById = (id: string | null | undefined) =>
  PERSONALITIES.find((personality) => personality.id === id);

export type GiftNote = ToritoGiftDto;

export interface OwnedTorito {
  id: string;
  name: string;
  color: ToritoColor;
  personality: Personality;
  /** Lo que su dueño quiere que le recuerde. */
  intention: string | null;
  gift: GiftNote | null;
  serial: number;
  /** Último día visitado, en hora de Lima. */
  lastVisitOn: string | null;
  visitStreak: number;
}

export function ownedFromDto(dto: ToritoDto): OwnedTorito {
  return {
    id: dto.id,
    name: dto.name,
    color: colorById(dto.colorCode),
    personality: personalityById(dto.personalityCode) ?? PERSONALITIES[0]!,
    intention: dto.intention,
    gift: dto.gift,
    serial: dto.serial,
    lastVisitOn: dto.lastVisitOn,
    visitStreak: dto.visitStreak,
  };
}

const NO_VISITS = { lastVisitOn: null, visitStreak: 0 };

export function exampleTorito(personality: Personality = PERSONALITIES[0]!): OwnedTorito {
  return {
    id: personality.id,
    name: personality.name,
    color: DEFAULT_COLOR,
    personality,
    intention: null,
    gift: null,
    serial: 1,
    ...NO_VISITS,
  };
}

const EXAMPLE_NAMES = [
  'Sombra',
  'Lago',
  'Sol',
  'Bosque',
  'Inti',
  'Killa',
  'Wayra',
  'Luna',
  'Trueno',
  'Ñusta',
  'Pacha',
  'Illa',
  'Rayo',
  'Coca',
  'Nube',
  'Puma',
  'Tika',
  'Sumaq',
  'Mayu',
  'Urpi',
];

/** Una colección inventada, para ver cómo se ve un establo con muchos toritos. */
export function exampleCollection(count: number): OwnedTorito[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ejemplo-${index + 1}`,
    name: EXAMPLE_NAMES[index % EXAMPLE_NAMES.length]!,
    color: TORITO_COLORS[(index + 1) % TORITO_COLORS.length]!,
    personality: PERSONALITIES[index % PERSONALITIES.length]!,
    intention:
      index % 2 === 0 ? INTENTION_SUGGESTIONS[index % INTENTION_SUGGESTIONS.length]! : null,
    gift:
      index === 1
        ? {
            from: 'Mamá',
            to: 'Leo',
            message: 'Para que nunca se te olvide de dónde vienes. Te quiero mucho.',
          }
        : null,
    serial: index + 1,
    ...NO_VISITS,
  }));
}

const PENDING_CLAIM_KEY = 'antrina-torito-pendiente';

/** Lo elegido antes de iniciar sesión: se reclama en cuanto vuelve de Google. */
export interface PendingClaim {
  code: string;
  name: string;
  colorCode: ToritoColorCode;
  intention: string | null;
  personalityCode: ToritoPersonalityCode;
  serial: number;
  gift: GiftNote | null;
}

export function readPendingClaim(): PendingClaim | null {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(PENDING_CLAIM_KEY) ?? 'null',
    ) as Partial<PendingClaim> | null;
    return saved?.code && saved.name && saved.colorCode ? (saved as PendingClaim) : null;
  } catch {
    return null;
  }
}

export function savePendingClaim(claim: PendingClaim): void {
  try {
    window.localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(claim));
  } catch {
    // Sin almacenamiento habrá que volver a escanear el QR después de iniciar sesión.
  }
}

export function clearPendingClaim(): void {
  try {
    window.localStorage.removeItem(PENDING_CLAIM_KEY);
  } catch {
    // Nada que limpiar.
  }
}

/** Para enseñar el torito pendiente antes de que sea suyo de verdad. */
export function ownedFromPending(claim: PendingClaim): OwnedTorito {
  return {
    id: 'pendiente',
    name: claim.name,
    color: colorById(claim.colorCode),
    personality: personalityById(claim.personalityCode) ?? PERSONALITIES[0]!,
    intention: claim.intention,
    gift: claim.gift,
    serial: claim.serial,
    ...NO_VISITS,
  };
}
