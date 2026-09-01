import type { MonthlyFee } from '@/services/api/endpoints/finance';

/**
 * "Minha mensalidade" widget on Home: the current calendar month's fee if
 * one has been generated, else the most recent one — never guesses across
 * an empty list. Uses the device's local calendar month, matching what the
 * player themselves would consider "this month".
 */
export function pickMyMonthlyFeeForHome(fees: readonly MonthlyFee[], now: Date = new Date()): MonthlyFee | undefined {
  if (fees.length === 0) return undefined;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const current = fees.find((fee) => fee.referenceYear === currentYear && fee.referenceMonth === currentMonth);
  if (current) return current;

  return [...fees].sort((a, b) => b.referenceYear - a.referenceYear || b.referenceMonth - a.referenceMonth)[0];
}
