import { type PieceViewDto, TORITO_ROUTES } from '@antrina/contracts';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = 8000;

export type PieceResult =
  { status: 'ok'; piece: PieceViewDto } | { status: 'not_found' } | { status: 'unavailable' };

/** Lo que abre un QR. Lleva la cookie para saber si la pieza es de quien mira. */
export async function getPiece(code: string, cookie: string | null): Promise<PieceResult> {
  try {
    const response = await fetch(new URL(TORITO_ROUTES.piece(code), API_URL), {
      headers: cookie ? { cookie } : {},
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'unavailable' };
    return { status: 'ok', piece: (await response.json()) as PieceViewDto };
  } catch {
    return { status: 'unavailable' };
  }
}
