import { DomainError } from './domain-error.js';

export const SUPPORTED_CURRENCIES = ['PEN', 'USD'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Montos siempre en la unidad mínima (céntimos) para evitar errores de punto flotante.
 */
export class Money {
  private constructor(
    readonly amountInCents: number,
    readonly currency: Currency,
  ) {}

  static ofCents(amountInCents: number, currency: Currency): Money {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new DomainError(`Monto inválido: ${amountInCents}`, 'money.invalid_amount');
    }
    return new Money(amountInCents, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInCents > other.amountInCents;
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofCents(Math.max(0, this.amountInCents - other.amountInCents), this.currency);
  }

  percentage(percent: number): Money {
    return Money.ofCents(Math.round((this.amountInCents * percent) / 100), this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountInCents === other.amountInCents;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new DomainError(
        `No se pueden operar ${this.currency} y ${other.currency}`,
        'money.currency_mismatch',
      );
    }
  }
}
