import {
  type DomainError,
  type GiftNote,
  personalityForSerial,
  type Torito,
  type ToritoDraft,
  type ToritoPiece,
  type ToritoRepository,
} from '@antrina/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClaimPieceUseCase,
  GetPieceUseCase,
  ListMyToritosUseCase,
  RecordToritoVisitUseCase,
  SavePieceGiftUseCase,
  UpdateToritoIntentionUseCase,
} from '../src/index.js';
import { FakeClock } from './fakes.js';

const ANA = 'customer-ana';
const LUIS = 'customer-luis';
const GIFT = { from: 'Mamá', to: 'Leo', message: 'Te quiero mucho.' };
const CLAIM = { name: 'Sombra', colorCode: 'negro' as const, intention: 'Tener más calma' };

class InMemoryToritos implements ToritoRepository {
  readonly pieces = new Map<string, ToritoPiece>();
  readonly toritos = new Map<string, Torito>();

  addPiece(overrides: Partial<ToritoPiece> = {}): ToritoPiece {
    const piece: ToritoPiece = {
      id: `piece-${this.pieces.size + 1}`,
      code: `code-${this.pieces.size + 1}`,
      serial: this.pieces.size + 1,
      productName: 'Torito de Pucará',
      isTorito: true,
      isVoided: false,
      gift: null,
      claim: null,
      ...overrides,
    };
    this.pieces.set(piece.code, piece);
    return piece;
  }

  async findPieceByCode(code: string): Promise<ToritoPiece | null> {
    return this.pieces.get(code) ?? null;
  }

  async saveGift(pieceId: string, gift: GiftNote): Promise<void> {
    for (const piece of this.pieces.values()) if (piece.id === pieceId) piece.gift = gift;
  }

  async claim(pieceId: string, customerId: string, draft: ToritoDraft): Promise<Torito> {
    const piece = [...this.pieces.values()].find((candidate) => candidate.id === pieceId)!;
    const torito: Torito = {
      id: `torito-${this.toritos.size + 1}`,
      customerId,
      name: draft.name,
      color: draft.color,
      personality: personalityForSerial(piece.serial),
      intention: draft.intention,
      gift: piece.gift,
      serial: piece.serial,
      productName: piece.productName,
      lastVisitOn: null,
      visitStreak: 0,
      claimedAt: new Date('2026-11-01T12:00:00Z'),
    };
    this.toritos.set(torito.id, torito);
    piece.claim = { toritoId: torito.id, customerId };
    return torito;
  }

  async listByCustomer(customerId: string): Promise<Torito[]> {
    return [...this.toritos.values()].filter((torito) => torito.customerId === customerId);
  }

  async findById(id: string): Promise<Torito | null> {
    return this.toritos.get(id) ?? null;
  }

  async updateIntention(id: string, intention: string | null): Promise<Torito> {
    const torito = { ...this.toritos.get(id)!, intention };
    this.toritos.set(id, torito);
    return torito;
  }

  async recordVisit(id: string, day: string, streak: number): Promise<void> {
    this.toritos.set(id, { ...this.toritos.get(id)!, lastVisitOn: day, visitStreak: streak });
  }
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<DomainError>);
}

describe('toritos', () => {
  let repository: InMemoryToritos;
  let clock: FakeClock;
  let getPiece: GetPieceUseCase;
  let saveGift: SavePieceGiftUseCase;
  let claim: ClaimPieceUseCase;

  beforeEach(() => {
    repository = new InMemoryToritos();
    // Mediodía en Lima: la fecha no depende de la zona horaria del servidor.
    clock = new FakeClock(new Date('2026-11-01T17:00:00Z'));
    getPiece = new GetPieceUseCase(repository);
    saveGift = new SavePieceGiftUseCase(repository, clock);
    claim = new ClaimPieceUseCase(repository);
  });

  describe('la pieza', () => {
    it('muestra una pieza libre con su personalidad y el regalo', async () => {
      const piece = repository.addPiece({ gift: GIFT });
      const view = await getPiece.execute({ code: piece.code, customerId: null });
      expect(view).toMatchObject({
        status: 'available',
        personalityCode: 'inti',
        gift: GIFT,
        isMine: false,
        toritoId: null,
      });
    });

    it('la personalidad depende del número de pieza', () => {
      expect([1, 2, 3, 4].map(personalityForSerial)).toEqual(['inti', 'killa', 'wayra', 'inti']);
    });

    it('oculta el regalo en cuanto tiene dueño, también a su dueño en el QR', async () => {
      const piece = repository.addPiece({ gift: GIFT });
      const torito = await claim.execute(piece.code, ANA, CLAIM);

      const forStranger = await getPiece.execute({ code: piece.code, customerId: LUIS });
      expect(forStranger).toMatchObject({ status: 'claimed', gift: null, isMine: false });
      expect(forStranger.toritoId).toBeNull();

      const forOwner = await getPiece.execute({ code: piece.code, customerId: ANA });
      expect(forOwner).toMatchObject({ isMine: true, toritoId: torito.id });
    });

    it('un visitante sin sesión no pasa por dueño de una pieza reclamada', async () => {
      const piece = repository.addPiece();
      await claim.execute(piece.code, ANA, CLAIM);
      const view = await getPiece.execute({ code: piece.code, customerId: null });
      expect(view.isMine).toBe(false);
    });

    it('avisa de un código desconocido o anulado', async () => {
      await expectCode(getPiece.execute({ code: 'nada', customerId: null }), 'piece.not_found');
      const voided = repository.addPiece({ isVoided: true });
      const view = await getPiece.execute({ code: voided.code, customerId: null });
      expect(view.status).toBe('voided');
    });
  });

  describe('el regalo', () => {
    it('se guarda limpio y se puede cambiar antes de reclamar', async () => {
      const piece = repository.addPiece();
      await saveGift.execute(piece.code, { from: ' Ma*má ', to: '', message: ' Hola ' });
      expect(piece.gift).toEqual({ from: 'Mamá', to: null, message: 'Hola' });
      await saveGift.execute(piece.code, GIFT);
      expect(piece.gift).toEqual(GIFT);
    });

    it('no se puede cambiar cuando ya tiene dueño', async () => {
      const piece = repository.addPiece({ gift: GIFT });
      await claim.execute(piece.code, ANA, CLAIM);
      await expectCode(
        saveGift.execute(piece.code, { ...GIFT, message: 'Otro' }),
        'piece.already_claimed',
      );
      expect(piece.gift).toEqual(GIFT);
    });

    it('rechaza datos inválidos y piezas que no son toritos', async () => {
      const piece = repository.addPiece();
      await expectCode(
        saveGift.execute(piece.code, { from: '', to: null, message: 'Hola' }),
        'piece.invalid_gift',
      );
      await expectCode(
        saveGift.execute(piece.code, { from: 'A', to: null, message: 'x'.repeat(281) }),
        'piece.invalid_gift',
      );
      const tree = repository.addPiece({ isTorito: false });
      await expectCode(saveGift.execute(tree.code, GIFT), 'piece.not_torito');
    });
  });

  describe('reclamar', () => {
    it('crea el torito con el regalo de la pieza', async () => {
      const piece = repository.addPiece({ gift: GIFT });
      const torito = await claim.execute(piece.code, ANA, CLAIM);
      expect(torito).toMatchObject({
        name: 'Sombra',
        colorCode: 'negro',
        intention: 'Tener más calma',
        gift: GIFT,
        serial: piece.serial,
      });
    });

    it('el segundo no se la queda, y su dueño puede reintentar', async () => {
      const piece = repository.addPiece();
      const first = await claim.execute(piece.code, ANA, CLAIM);
      await expectCode(claim.execute(piece.code, LUIS, CLAIM), 'torito.duplicate_claim');
      await expect(claim.execute(piece.code, ANA, CLAIM)).resolves.toMatchObject({ id: first.id });
      expect(repository.toritos.size).toBe(1);
    });

    it('rechaza nombre, color, pieza anulada y pieza que no es torito', async () => {
      const piece = repository.addPiece();
      await expectCode(
        claim.execute(piece.code, ANA, { ...CLAIM, name: ' * ' }),
        'torito.invalid_name',
      );
      await expectCode(
        claim.execute(piece.code, ANA, { ...CLAIM, colorCode: 'rosa' as never }),
        'input.invalid',
      );
      const voided = repository.addPiece({ isVoided: true });
      await expectCode(claim.execute(voided.code, ANA, CLAIM), 'piece.voided');
      const tree = repository.addPiece({ isTorito: false });
      await expectCode(claim.execute(tree.code, ANA, CLAIM), 'piece.not_torito');
      expect(repository.toritos.size).toBe(0);
    });
  });

  describe('mis toritos', () => {
    it('cada quien ve solo los suyos', async () => {
      await claim.execute(repository.addPiece().code, ANA, CLAIM);
      await claim.execute(repository.addPiece().code, LUIS, { ...CLAIM, name: 'Lago' });
      const { data } = await new ListMyToritosUseCase(repository).execute(ANA);
      expect(data.map((torito) => torito.name)).toEqual(['Sombra']);
    });

    it('solo su dueño cambia la intención', async () => {
      const torito = await claim.execute(repository.addPiece().code, ANA, CLAIM);
      const update = new UpdateToritoIntentionUseCase(repository);
      await expectCode(update.execute(torito.id, LUIS, { intention: 'Ajena' }), 'torito.not_found');
      await expect(
        update.execute(torito.id, ANA, { intention: ' Dormir mejor ' }),
      ).resolves.toMatchObject({ intention: 'Dormir mejor' });
      await expect(update.execute(torito.id, ANA, { intention: '' })).resolves.toMatchObject({
        intention: null,
      });
    });

    it('cuenta los días seguidos en hora de Lima', async () => {
      const torito = await claim.execute(repository.addPiece().code, ANA, CLAIM);
      const visit = new RecordToritoVisitUseCase(repository, clock);

      await expect(visit.execute(torito.id, ANA)).resolves.toEqual({
        lastVisitOn: '2026-11-01',
        visitStreak: 1,
      });
      // Dos veces el mismo día no suma.
      await expect(visit.execute(torito.id, ANA)).resolves.toMatchObject({ visitStreak: 1 });

      // 23:30 en Lima sigue siendo el mismo día, aunque en UTC ya sea el siguiente.
      clock.current = new Date('2026-11-02T04:30:00Z');
      await expect(visit.execute(torito.id, ANA)).resolves.toEqual({
        lastVisitOn: '2026-11-01',
        visitStreak: 1,
      });

      clock.current = new Date('2026-11-02T17:00:00Z');
      await expect(visit.execute(torito.id, ANA)).resolves.toMatchObject({ visitStreak: 2 });

      clock.current = new Date('2026-11-05T17:00:00Z');
      await expect(visit.execute(torito.id, ANA)).resolves.toMatchObject({ visitStreak: 1 });
    });

    it('nadie registra visitas en el torito de otro', async () => {
      const torito = await claim.execute(repository.addPiece().code, ANA, CLAIM);
      await expectCode(
        new RecordToritoVisitUseCase(repository, clock).execute(torito.id, LUIS),
        'torito.not_found',
      );
    });
  });
});
