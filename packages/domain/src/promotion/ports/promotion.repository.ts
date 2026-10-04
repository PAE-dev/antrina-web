import { type Promotion } from '../promotion.js';

export interface PromotionRepository {
  findActive(at: Date): Promise<Promotion[]>;
}
