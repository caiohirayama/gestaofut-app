import type { CashTransaction, CashTransactionCategory } from '@/services/api/endpoints/finance';
import { sumMoney } from './money';

function belongsToMonth(date: Date, year: number, month: number): boolean {
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
}

export interface CashMonthSummary {
  /** Sum of CONFIRMED `INCOME` rows whose `occurredAt` falls in the selected month. */
  income: string;
  /** Sum of CONFIRMED `EXPENSE` rows whose `occurredAt` falls in the selected month. */
  expense: string;
}

/**
 * "Entradas do mês"/"Saídas do mês" — unlike `Saldo atual` (the server's
 * all-time `CashBalance`), the API has no month-scoped totals endpoint for
 * the caixa (see gestaofut-api docs/finance.md, "CAIXA"), so this sums the
 * already-fetched list client-side, the same pattern `computeDashboardTotals`
 * uses for mensalidades/cobranças. `CANCELLED` rows are excluded — an
 * estorno never counts toward either total.
 */
export function computeCashMonthSummary(cashTransactions: CashTransaction[], year: number, month: number): CashMonthSummary {
  const confirmedForMonth = cashTransactions.filter(
    (transaction) => transaction.status === 'CONFIRMED' && belongsToMonth(new Date(transaction.occurredAt), year, month),
  );
  return {
    income: sumMoney(confirmedForMonth.filter((transaction) => transaction.type === 'INCOME').map((transaction) => transaction.amount)),
    expense: sumMoney(confirmedForMonth.filter((transaction) => transaction.type === 'EXPENSE').map((transaction) => transaction.amount)),
  };
}

export interface CashTransactionListFilters {
  readonly category?: CashTransactionCategory;
  readonly referenceYear?: number;
  readonly referenceMonth?: number;
}

/** "Filtros: categoria; período" — both applied client-side over one unfiltered fetch, same rationale as the pendências list (`filterFinanceListItems`). */
export function filterCashTransactions(cashTransactions: CashTransaction[], filters: CashTransactionListFilters): CashTransaction[] {
  return cashTransactions
    .filter((transaction) => {
      if (filters.category !== undefined && transaction.category !== filters.category) return false;
      if (filters.referenceYear !== undefined && filters.referenceMonth !== undefined) {
        if (!belongsToMonth(new Date(transaction.occurredAt), filters.referenceYear, filters.referenceMonth)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
