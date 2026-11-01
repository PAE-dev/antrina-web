export const TORITO_COLOR_CODES = ['rojo', 'negro', 'azul', 'amarillo', 'verde', 'morado'] as const;
export type ToritoColorCode = (typeof TORITO_COLOR_CODES)[number];

export const TORITO_PERSONALITY_CODES = ['inti', 'killa', 'wayra'] as const;
export type ToritoPersonalityCode = (typeof TORITO_PERSONALITY_CODES)[number];

export const TORITO_LIMITS = {
  name: 20,
  intention: 120,
  giftName: 30,
  giftMessage: 280,
} as const;

/** Lo que deja quien regala; se lee cuando el torito despierta. */
export interface ToritoGiftDto {
  from: string;
  to: string | null;
  message: string;
}

export type PieceStatus = 'available' | 'claimed' | 'voided';

/** Lo que abre el QR. El mensaje de regalo solo viaja mientras la pieza no tenga dueño. */
export interface PieceViewDto {
  code: string;
  serial: number;
  productName: string;
  /** Solo las piezas de categorías de toritos tienen nacimiento y establo. */
  isTorito: boolean;
  status: PieceStatus;
  personalityCode: ToritoPersonalityCode;
  gift: ToritoGiftDto | null;
  /** El torito ya es de quien mira: lleva directo a su establo. */
  isMine: boolean;
  toritoId: string | null;
}

export interface SavePieceGiftRequest {
  from: string;
  to: string | null;
  message: string;
}

export interface ClaimPieceRequest {
  name: string;
  colorCode: ToritoColorCode;
  intention: string | null;
}

export interface ToritoDto {
  id: string;
  name: string;
  colorCode: ToritoColorCode;
  personalityCode: ToritoPersonalityCode;
  intention: string | null;
  gift: ToritoGiftDto | null;
  serial: number;
  productName: string;
  /** Último día visitado, `AAAA-MM-DD` en hora de Lima. */
  lastVisitOn: string | null;
  visitStreak: number;
  claimedAt: string;
}

export interface ToritoListResponse {
  data: ToritoDto[];
}

export interface UpdateToritoRequest {
  intention: string | null;
}

export interface ToritoVisitDto {
  lastVisitOn: string;
  visitStreak: number;
}

/** La tienda reenvía estas rutas desde su dominio, como las de acceso, para llevar la cookie. */
export const TORITO_ROUTES = {
  prefix: '/establo-api',
  piece: (code: string) => `/establo-api/pieces/${encodeURIComponent(code)}`,
  pieceGift: (code: string) => `/establo-api/pieces/${encodeURIComponent(code)}/gift`,
  pieceClaim: (code: string) => `/establo-api/pieces/${encodeURIComponent(code)}/claim`,
  toritos: '/establo-api/toritos',
  torito: (id: string) => `/establo-api/toritos/${encodeURIComponent(id)}`,
  toritoVisit: (id: string) => `/establo-api/toritos/${encodeURIComponent(id)}/visit`,
} as const;
