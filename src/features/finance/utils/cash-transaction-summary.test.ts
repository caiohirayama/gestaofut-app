import type { CashTransaction } from '@/services/api/endpoints/finance';
import { computeCashMonthSummary, filterCashTransactions } from './cash-transaction-summary';

function cashTransaction(overrides: Partial<CashTransaction> = {}): CashTransaction {
  return {
    id: 'cash-1',
    groupId: 'group-1',
    type: 'EXPENSE',
    category: 'BALLS',
    description: null,
    amount: '60.00',
    occurredAt: '2026-03-05T00:00:00.000Z',
    createdByUserId: 'admin-1',
    paymentId: null,
    status: 'CONFIRMED',
    createdAt: '2026-03-05T00:00:00.000Z',
    cancelledAt: null,
    ...overrides,
  };
}

describe('computeCashMonthSummary — "Entradas do mês; Saídas do mês"', () => {
  it('sums CONFIRMED income and expense for the given month, ignoring other months', () => {
    const transactions = [
      cashTransaction({ id: 'in-march', type: 'INCOME', amount: '150.00', occurredAt: '2026-03-01T00:00:00.000Z' }),
      cashTransaction({ id: 'out-march', type: 'EXPENSE', amount: '60.00', occurredAt: '2026-03-15T00:00:00.000Z' }),
      cashTransaction({ id: 'in-april', type: 'INCOME', amount: '999.00', occurredAt: '2026-04-01T00:00:00.000Z' }),
    ];

    const summary = computeCashMonthSummary(transactions, 2026, 3);

    expect(summary).toEqual({ income: '150.00', expense: '60.00' });
  });

  it('excludes CANCELLED rows — an estorno never counts toward either total', () => {
    const transactions = [
      cashTransaction({ id: 'confirmed', type: 'EXPENSE', amount: '60.00', status: 'CONFIRMED' }),
      cashTransaction({ id: 'cancelled', type: 'EXPENSE', amount: '999.00', status: 'CANCELLED' }),
    ];

    expect(computeCashMonthSummary(transactions, 2026, 3)).toEqual({ income: '0.00', expense: '60.00' });
  });

  it('returns "0.00" for both fields when nothing matches the month', () => {
    expect(computeCashMonthSummary([], 2026, 3)).toEqual({ income: '0.00', expense: '0.00' });
  });
});

describe('filterCashTransactions — "Filtros: categoria; período"', () => {
  it('filters by category', () => {
    const transactions = [cashTransaction({ id: 'balls', category: 'BALLS' }), cashTransaction({ id: 'drinks', category: 'DRINKS' })];

    expect(filterCashTransactions(transactions, { category: 'BALLS' }).map((t) => t.id)).toEqual(['balls']);
  });

  it('filters by período (year + month)', () => {
    const transactions = [
      cashTransaction({ id: 'march', occurredAt: '2026-03-10T00:00:00.000Z' }),
      cashTransaction({ id: 'april', occurredAt: '2026-04-10T00:00:00.000Z' }),
    ];

    expect(filterCashTransactions(transactions, { referenceYear: 2026, referenceMonth: 3 }).map((t) => t.id)).toEqual(['march']);
  });

  it('combines category and período filters (AND, not OR)', () => {
    const transactions = [
      cashTransaction({ id: 'match', category: 'BALLS', occurredAt: '2026-03-10T00:00:00.000Z' }),
      cashTransaction({ id: 'wrong-category', category: 'DRINKS', occurredAt: '2026-03-10T00:00:00.000Z' }),
      cashTransaction({ id: 'wrong-month', category: 'BALLS', occurredAt: '2026-04-10T00:00:00.000Z' }),
    ];

    const result = filterCashTransactions(transactions, { category: 'BALLS', referenceYear: 2026, referenceMonth: 3 });

    expect(result.map((t) => t.id)).toEqual(['match']);
  });

  it('sorts newest-first by occurredAt', () => {
    const transactions = [
      cashTransaction({ id: 'older', occurredAt: '2026-03-01T00:00:00.000Z' }),
      cashTransaction({ id: 'newer', occurredAt: '2026-03-20T00:00:00.000Z' }),
    ];

    expect(filterCashTransactions(transactions, {}).map((t) => t.id)).toEqual(['newer', 'older']);
  });

  it('returns everything when no filters are given', () => {
    const transactions = [cashTransaction({ id: 'a' }), cashTransaction({ id: 'b' })];

    expect(filterCashTransactions(transactions, {})).toHaveLength(2);
  });
});
