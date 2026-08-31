import type { Charge, MonthlyFee } from '@/services/api/endpoints/finance';
import { computeDashboardTotals, describeFinanceListItem, filterFinanceListItems, toFinanceListItems } from './finance-summary';

function fee(overrides: Partial<MonthlyFee> = {}): MonthlyFee {
  return {
    id: 'fee-1',
    groupId: 'group-1',
    groupMemberId: 'member-1',
    referenceYear: 2026,
    referenceMonth: 3,
    amount: '150.00',
    dueDate: '2026-03-01',
    status: 'PENDING',
    createdAt: '2026-02-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function charge(overrides: Partial<Charge> = {}): Charge {
  return {
    id: 'charge-1',
    groupId: 'group-1',
    groupMemberId: 'member-1',
    type: 'MANUAL',
    matchParticipantId: null,
    description: null,
    amount: '80.00',
    dueDate: '2026-03-10',
    status: 'PENDING',
    createdAt: '2026-03-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

describe('computeDashboardTotals — "previsto; recebido; pendente; avulsos"', () => {
  it('computes all four totals for a given month, ignoring other months', () => {
    const fees = [
      fee({ id: '1', amount: '150.00', status: 'PAID' }),
      fee({ id: '2', amount: '150.00', status: 'PENDING' }),
      fee({ id: '3', amount: '150.00', status: 'OVERDUE' }),
      fee({ id: '4', amount: '150.00', status: 'CANCELLED' }),
      fee({ id: 'other-month', referenceMonth: 4, amount: '999.00', status: 'PENDING' }),
    ];
    const charges = [charge({ id: 'c1', amount: '30.00', dueDate: '2026-03-15' })];

    const totals = computeDashboardTotals(fees, charges, 2026, 3);

    expect(totals.previsto).toBe('600.00'); // all 4 March fees, any status
    expect(totals.recebido).toBe('150.00'); // only the PAID one
    expect(totals.pendente).toBe('300.00'); // PENDING + OVERDUE
    expect(totals.avulsos).toBe('30.00');
  });

  it('falls back to createdAt for a charge with no dueDate', () => {
    const charges = [charge({ id: 'c1', dueDate: null, createdAt: '2026-03-05T00:00:00.000Z', amount: '20.00' })];

    const totals = computeDashboardTotals([], charges, 2026, 3);

    expect(totals.avulsos).toBe('20.00');
  });

  it('returns "0.00" for every field when nothing matches the month', () => {
    const totals = computeDashboardTotals([], [], 2026, 3);

    expect(totals).toEqual({ previsto: '0.00', recebido: '0.00', pendente: '0.00', avulsos: '0.00' });
  });
});

describe('toFinanceListItems + filterFinanceListItems — "Filtros: mês; status; tipo; jogador"', () => {
  it('normalizes monthly fees and charges into one sorted list', () => {
    const items = toFinanceListItems(
      [fee({ id: 'fee-later', dueDate: '2026-03-20' }), fee({ id: 'fee-earlier', dueDate: '2026-03-01' })],
      [charge({ id: 'charge-mid', dueDate: '2026-03-10' })],
    );

    expect(items.map((i) => i.id)).toEqual(['fee-earlier', 'charge-mid', 'fee-later']);
    expect(items.find((i) => i.id === 'fee-earlier')?.kind).toBe('MONTHLY_FEE');
    expect(items.find((i) => i.id === 'charge-mid')?.kind).toBe('MANUAL');
  });

  it('filters by month', () => {
    const items = toFinanceListItems([fee({ id: 'march', referenceMonth: 3 }), fee({ id: 'april', referenceMonth: 4, dueDate: '2026-04-01' })], []);

    const result = filterFinanceListItems(items, { referenceYear: 2026, referenceMonth: 3 });

    expect(result.map((i) => i.id)).toEqual(['march']);
  });

  it('filters by status', () => {
    const items = toFinanceListItems([fee({ id: 'paid', status: 'PAID' }), fee({ id: 'pending', status: 'PENDING' })], []);

    expect(filterFinanceListItems(items, { status: 'PAID' }).map((i) => i.id)).toEqual(['paid']);
  });

  it('filters by tipo (kind)', () => {
    const items = toFinanceListItems([fee({ id: 'fee-1' })], [charge({ id: 'charge-1', type: 'GUEST_MATCH_FEE' })]);

    expect(filterFinanceListItems(items, { kind: 'GUEST_MATCH_FEE' }).map((i) => i.id)).toEqual(['charge-1']);
    expect(filterFinanceListItems(items, { kind: 'MONTHLY_FEE' }).map((i) => i.id)).toEqual(['fee-1']);
  });

  it('filters by jogador (groupMemberId) — never leaks another player\'s items when filtered', () => {
    const items = toFinanceListItems([fee({ id: 'mine', groupMemberId: 'member-a' }), fee({ id: 'theirs', groupMemberId: 'member-b' })], []);

    expect(filterFinanceListItems(items, { groupMemberId: 'member-a' }).map((i) => i.id)).toEqual(['mine']);
  });

  it('combines multiple filters (AND, not OR)', () => {
    const items = toFinanceListItems(
      [
        fee({ id: 'match', groupMemberId: 'member-a', status: 'OVERDUE', referenceMonth: 3 }),
        fee({ id: 'wrong-status', groupMemberId: 'member-a', status: 'PAID', referenceMonth: 3 }),
        fee({ id: 'wrong-member', groupMemberId: 'member-b', status: 'OVERDUE', referenceMonth: 3 }),
      ],
      [],
    );

    const result = filterFinanceListItems(items, {
      groupMemberId: 'member-a',
      status: 'OVERDUE',
      referenceYear: 2026,
      referenceMonth: 3,
    });

    expect(result.map((i) => i.id)).toEqual(['match']);
  });

  it('returns everything when no filters are given', () => {
    const items = toFinanceListItems([fee()], [charge()]);

    expect(filterFinanceListItems(items, {})).toHaveLength(2);
  });
});

describe('describeFinanceListItem', () => {
  it('describes a monthly fee by its reference period', () => {
    const [item] = toFinanceListItems([fee({ referenceYear: 2026, referenceMonth: 3 })], []);

    expect(describeFinanceListItem(item!)).toBe('Mensalidade — março de 2026');
  });

  it('describes a MANUAL charge by its own description', () => {
    const [item] = toFinanceListItems([], [charge({ type: 'MANUAL', description: 'Uniforme extra' })]);

    expect(describeFinanceListItem(item!)).toBe('Uniforme extra');
  });

  it('falls back to a generic label for a MANUAL charge with no description', () => {
    const [item] = toFinanceListItems([], [charge({ type: 'MANUAL', description: null })]);

    expect(describeFinanceListItem(item!)).toBe('Avulso');
  });

  it('describes a GUEST_MATCH_FEE charge as an avulso de jogo', () => {
    const [item] = toFinanceListItems([], [charge({ type: 'GUEST_MATCH_FEE', description: null })]);

    expect(describeFinanceListItem(item!)).toBe('Avulso de jogo');
  });
});
