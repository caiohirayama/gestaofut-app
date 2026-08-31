import { Decimal } from 'decimal.js';

/**
 * Every amount from gestaofut-api is a raw `NUMERIC` string (never parsed
 * to `number` in transit — see its docs/database.md). `decimal.js` is used
 * here for the one thing this app actually computes client-side (the
 * dashboard's summed totals); everywhere else the string is just displayed
 * as-is via `formatMoney`.
 */

/** Sums a list of amount strings without floating-point drift. */
export function sumMoney(amounts: readonly string[]): string {
  return amounts.reduce((total, amount) => total.plus(new Decimal(amount)), new Decimal(0)).toFixed(2);
}

/**
 * "Valores em BRL inicialmente, mas respeitar currency fornecida pela
 * API": `currency` always comes from `GroupSettings.currency` (default
 * `'BRL'` server-side, see gestaofut-api docs) — never hardcoded here.
 * Locale stays `pt-BR` (all copy in the app is Portuguese) independent of
 * which currency code is being formatted.
 */
export function formatMoney(amount: string, currency: string = 'BRL'): string {
  const value = new Decimal(amount).toNumber();
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}
