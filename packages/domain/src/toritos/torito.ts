import { DomainError } from '../shared/domain-error.js';

export const TORITO_COLORS = ['rojo', 'negro', 'azul', 'amarillo', 'verde', 'morado'] as const;
export type ToritoColor = (typeof TORITO_COLORS)[number];

/** La personalidad se deduce del número de pieza: no cambia ni depende de quién la reclame. */
export const TORITO_PERSONALITIES = ['inti', 'killa', 'wayra'] as const;
export type ToritoPersonality = (typeof TORITO_PERSONALITIES)[number];

export const personalityForSerial = (serial: number): ToritoPersonality =>
  TORITO_PERSONALITIES[(serial - 1) % TORITO_PERSONALITIES.length]!;

export const TORITO_NAME_MAX = 20;
export const TORITO_INTENTION_MAX = 120;
export const GIFT_NAME_MAX = 30;
export const GIFT_MESSAGE_MAX = 280;

const TORITO_CATEGORY_PREFIX = 'torito';

/** Una pieza es un torito si su categoría, o la categoría madre, empieza por "torito". */
export function isToritoCategory(slug: string, parentSlug: string | null): boolean {
  return (
    slug.startsWith(TORITO_CATEGORY_PREFIX) ||
    Boolean(parentSlug?.startsWith(TORITO_CATEGORY_PREFIX))
  );
}

export interface GiftNote {
  from: string;
  to: string | null;
  message: string;
}

/** Pieza vista desde el QR. */
export interface ToritoPiece {
  id: string;
  code: string;
  serial: number;
  productName: string;
  isTorito: boolean;
  isVoided: boolean;
  gift: GiftNote | null;
  claim: { toritoId: string; customerId: string } | null;
}

export interface Torito {
  id: string;
  customerId: string;
  name: string;
  color: ToritoColor;
  personality: ToritoPersonality;
  intention: string | null;
  gift: GiftNote | null;
  serial: number;
  productName: string;
  lastVisitOn: string | null;
  visitStreak: number;
  claimedAt: Date;
}

export interface ToritoDraft {
  name: string;
  color: ToritoColor;
  intention: string | null;
}

/** Sin `*`: en los títulos de la tienda sirve para resaltar palabras. */
export const cleanToritoText = (text: string) => text.replaceAll('*', '').trim();

export function validateToritoName(name: string): string {
  const clean = cleanToritoText(name);
  if (clean.length === 0 || clean.length > TORITO_NAME_MAX) {
    throw new DomainError(
      `Ponle un nombre de hasta ${TORITO_NAME_MAX} letras`,
      'torito.invalid_name',
    );
  }
  return clean;
}

export function validateIntention(intention: string | null): string | null {
  const clean = cleanToritoText(intention ?? '');
  if (clean.length > TORITO_INTENTION_MAX) {
    throw new DomainError(
      `La intención tiene máximo ${TORITO_INTENTION_MAX} caracteres`,
      'torito.invalid_intention',
    );
  }
  return clean.length > 0 ? clean : null;
}

export function validateGift(gift: GiftNote): GiftNote {
  const from = cleanToritoText(gift.from);
  const to = cleanToritoText(gift.to ?? '');
  const message = gift.message.trim();
  if (from.length === 0 || from.length > GIFT_NAME_MAX || to.length > GIFT_NAME_MAX) {
    throw new DomainError(
      `Los nombres tienen máximo ${GIFT_NAME_MAX} caracteres`,
      'piece.invalid_gift',
    );
  }
  if (message.length === 0 || message.length > GIFT_MESSAGE_MAX) {
    throw new DomainError(
      `El mensaje debe tener entre 1 y ${GIFT_MESSAGE_MAX} caracteres`,
      'piece.invalid_gift',
    );
  }
  return { from, to: to.length > 0 ? to : null, message };
}

const LIMA_TIME_ZONE = 'America/Lima';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha en Lima como `AAAA-MM-DD`: los días de visita cambian a medianoche allí. */
export function limaDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TIME_ZONE }).format(now);
}

/** Visitar dos veces el mismo día no suma; saltarse un día vuelve a empezar. */
export function nextVisitStreak(lastVisitOn: string | null, streak: number, today: string): number {
  if (lastVisitOn === today) return streak;
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  return lastVisitOn === yesterday ? streak + 1 : 1;
}
