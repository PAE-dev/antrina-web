import { DomainError } from '../shared/domain-error.js';
import { Money } from '../shared/money.js';

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface PromotionProps {
  id: string;
  code: string | null;
  name: string;
  discountType: DiscountType;
  /** Porcentaje (1-100) o céntimos según discountType. */
  value: number;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
}

export class Promotion {
  private constructor(private readonly props: PromotionProps) {}

  static create(props: PromotionProps): Promotion {
    if (props.discountType === 'PERCENTAGE' && (props.value <= 0 || props.value > 100)) {
      throw new DomainError('El porcentaje debe estar entre 1 y 100', 'promotion.invalid_value');
    }
    if (props.discountType === 'FIXED_AMOUNT' && props.value <= 0) {
      throw new DomainError('El descuento fijo debe ser positivo', 'promotion.invalid_value');
    }
    if (props.endsAt && props.endsAt <= props.startsAt) {
      throw new DomainError('La promoción termina antes de empezar', 'promotion.invalid_range');
    }
    return new Promotion(props);
  }

  get id(): string {
    return this.props.id;
  }

  get code(): string | null {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  isApplicableAt(date: Date): boolean {
    if (!this.props.isActive) return false;
    if (date < this.props.startsAt) return false;
    return this.props.endsAt === null || date < this.props.endsAt;
  }

  applyTo(price: Money): Money {
    const discount =
      this.props.discountType === 'PERCENTAGE'
        ? price.percentage(this.props.value)
        : Money.ofCents(Math.min(this.props.value, price.amountInCents), price.currency);
    return price.subtract(discount);
  }
}
