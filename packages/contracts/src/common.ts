export type LocaleCode = 'es' | 'en';

export type CurrencyCode = 'PEN' | 'USD';

export interface MoneyDto {
  /** Monto en céntimos. */
  amount: number;
  currency: CurrencyCode;
}

export interface ListResponse<T> {
  data: T[];
}
