import { type GiftNote, type Torito, type ToritoDraft, type ToritoPiece } from '../torito.js';

export interface ToritoRepository {
  findPieceByCode(code: string): Promise<ToritoPiece | null>;
  saveGift(pieceId: string, gift: GiftNote, now: Date): Promise<void>;
  /** Lanza `torito.duplicate_claim` si otra persona la reclamó primero. */
  claim(pieceId: string, customerId: string, draft: ToritoDraft): Promise<Torito>;
  /** Del más antiguo al más nuevo: cada uno conserva su corral. */
  listByCustomer(customerId: string): Promise<Torito[]>;
  findById(id: string): Promise<Torito | null>;
  updateIntention(id: string, intention: string | null): Promise<Torito>;
  recordVisit(id: string, day: string, streak: number): Promise<void>;
}
