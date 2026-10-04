import { type MoneyDto } from '@antrina/contracts';
import { type Money } from '@antrina/domain';

export function toMoneyDto(money: Money): MoneyDto {
  return { amount: money.amountInCents, currency: money.currency };
}
