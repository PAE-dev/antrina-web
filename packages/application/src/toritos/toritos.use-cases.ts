import {
  type ClaimPieceRequest,
  type PieceViewDto,
  type SavePieceGiftRequest,
  type ToritoDto,
  type ToritoListResponse,
  type ToritoVisitDto,
  type UpdateToritoRequest,
} from '@antrina/contracts';
import {
  type Clock,
  DomainError,
  limaDateKey,
  nextVisitStreak,
  personalityForSerial,
  type Torito,
  TORITO_COLORS,
  TORITO_INTENTION_MAX,
  type ToritoPiece,
  type ToritoRepository,
  validateGift,
  validateIntention,
  validateToritoName,
} from '@antrina/domain';
import { notFound, optionalString, requireOneOf, requireString } from '../shared/input.js';

function toToritoDto(torito: Torito): ToritoDto {
  return {
    id: torito.id,
    name: torito.name,
    colorCode: torito.color,
    personalityCode: torito.personality,
    intention: torito.intention,
    gift: torito.gift,
    serial: torito.serial,
    productName: torito.productName,
    lastVisitOn: torito.lastVisitOn,
    visitStreak: torito.visitStreak,
    claimedAt: torito.claimedAt.toISOString(),
  };
}

function pieceStatus(piece: ToritoPiece): PieceViewDto['status'] {
  if (piece.isVoided) return 'voided';
  return piece.claim ? 'claimed' : 'available';
}

const pieceNotFound = () => notFound('Código', 'piece.not_found');

async function loadClaimablePiece(toritos: ToritoRepository, code: string): Promise<ToritoPiece> {
  const piece = await toritos.findPieceByCode(requireString(code, 'code', 64));
  if (!piece) throw pieceNotFound();
  if (piece.isVoided) throw new DomainError('Este código fue anulado', 'piece.voided');
  if (!piece.isTorito) throw new DomainError('Esta pieza no es un torito', 'piece.not_torito');
  return piece;
}

/** Lo que abre el QR. El regalo se oculta en cuanto la pieza tiene dueño: ya es solo suyo. */
export class GetPieceUseCase {
  constructor(private readonly toritos: ToritoRepository) {}

  async execute(input: { code: string; customerId: string | null }): Promise<PieceViewDto> {
    const piece = await this.toritos.findPieceByCode(requireString(input.code, 'code', 64));
    if (!piece) throw pieceNotFound();
    const isMine = piece.claim !== null && piece.claim.customerId === input.customerId;
    return {
      code: piece.code,
      serial: piece.serial,
      productName: piece.productName,
      isTorito: piece.isTorito,
      status: pieceStatus(piece),
      personalityCode: personalityForSerial(piece.serial),
      gift: piece.claim ? null : piece.gift,
      isMine,
      toritoId: isMine ? piece.claim!.toritoId : null,
    };
  }
}

/** Quien regala deja su mensaje; se puede cambiar hasta que el torito tenga dueño. */
export class SavePieceGiftUseCase {
  constructor(
    private readonly toritos: ToritoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(code: string, input: SavePieceGiftRequest): Promise<void> {
    const piece = await loadClaimablePiece(this.toritos, code);
    if (piece.claim) {
      throw new DomainError('Este torito ya despertó con su dueño', 'piece.already_claimed');
    }
    const gift = validateGift({
      from: requireString(input?.from, 'from', 200),
      to: optionalString(input?.to, 'to', 200),
      message: requireString(input?.message, 'message', 2000),
    });
    await this.toritos.saveGift(piece.id, gift, this.clock.now());
  }
}

/** El primero que inicia sesión con la pieza se queda con su torito. */
export class ClaimPieceUseCase {
  constructor(private readonly toritos: ToritoRepository) {}

  async execute(code: string, customerId: string, input: ClaimPieceRequest): Promise<ToritoDto> {
    const piece = await loadClaimablePiece(this.toritos, code);
    if (piece.claim) {
      // Reintentar tras un corte de red no debe fallar a quien ya es su dueño.
      if (piece.claim.customerId === customerId) {
        const own = await this.toritos.findById(piece.claim.toritoId);
        if (own) return toToritoDto(own);
      }
      throw new DomainError('Este torito ya tiene dueño', 'torito.duplicate_claim');
    }
    const torito = await this.toritos.claim(piece.id, customerId, {
      name: validateToritoName(requireString(input?.name, 'name', 200)),
      color: requireOneOf(input?.colorCode, TORITO_COLORS, 'colorCode'),
      intention: validateIntention(optionalString(input?.intention, 'intention', 2000)),
    });
    return toToritoDto(torito);
  }
}

export class ListMyToritosUseCase {
  constructor(private readonly toritos: ToritoRepository) {}

  async execute(customerId: string): Promise<ToritoListResponse> {
    const toritos = await this.toritos.listByCustomer(customerId);
    return { data: toritos.map(toToritoDto) };
  }
}

async function loadOwnTorito(
  toritos: ToritoRepository,
  id: string,
  customerId: string,
): Promise<Torito> {
  const torito = await toritos.findById(requireString(id, 'id', 64));
  // Mismo error si no existe o es de otro: no revela qué toritos hay.
  if (!torito || torito.customerId !== customerId) throw notFound('Torito', 'torito.not_found');
  return torito;
}

export class UpdateToritoIntentionUseCase {
  constructor(private readonly toritos: ToritoRepository) {}

  async execute(id: string, customerId: string, input: UpdateToritoRequest): Promise<ToritoDto> {
    await loadOwnTorito(this.toritos, id, customerId);
    const intention = validateIntention(
      optionalString(input?.intention, 'intention', TORITO_INTENTION_MAX * 4),
    );
    return toToritoDto(await this.toritos.updateIntention(id, intention));
  }
}

export class RecordToritoVisitUseCase {
  constructor(
    private readonly toritos: ToritoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, customerId: string): Promise<ToritoVisitDto> {
    const torito = await loadOwnTorito(this.toritos, id, customerId);
    const today = limaDateKey(this.clock.now());
    const streak = nextVisitStreak(torito.lastVisitOn, torito.visitStreak, today);
    if (torito.lastVisitOn !== today) await this.toritos.recordVisit(id, today, streak);
    return { lastVisitOn: today, visitStreak: streak };
  }
}
