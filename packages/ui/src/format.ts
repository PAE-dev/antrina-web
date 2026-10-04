import { type MoneyDto } from '@antrina/contracts';

const INTL_LOCALE: Record<string, string> = { es: 'es-PE', en: 'en-US' };

/** Monedas cuyo símbolo local no conoce Intl fuera de su país (en-US muestra "PEN 289"). */
const CURRENCY_LOCALE: Partial<Record<MoneyDto['currency'], string>> = { PEN: 'es-PE' };

/** Montos en céntimos. Sin decimales cuando el precio es entero (S/ 289, no S/ 289.00). */
export function formatMoney(money: MoneyDto, locale: string): string {
  const fractionDigits = money.amount % 100 === 0 ? 0 : 2;
  const intlLocale = CURRENCY_LOCALE[money.currency] ?? INTL_LOCALE[locale] ?? locale;
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(money.amount / 100);
}
