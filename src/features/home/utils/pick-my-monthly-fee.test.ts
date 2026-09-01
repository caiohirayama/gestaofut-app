import type { MonthlyFee } from '@/services/api/endpoints/finance';
import { pickMyMonthlyFeeForHome } from './pick-my-monthly-fee';

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
    createdAt: '',
    paidAt: null,
    ...overrides,
  };
}

describe('pickMyMonthlyFeeForHome', () => {
  const now = new Date(2026, 2, 15); // March 2026

  it('returns undefined for an empty list', () => {
    expect(pickMyMonthlyFeeForHome([], now)).toBeUndefined();
  });

  it('prefers the current calendar month fee when it exists', () => {
    const current = fee({ id: 'current', referenceYear: 2026, referenceMonth: 3 });
    const older = fee({ id: 'older', referenceYear: 2026, referenceMonth: 1 });

    expect(pickMyMonthlyFeeForHome([older, current], now)?.id).toBe('current');
  });

  it('falls back to the most recent fee when there is none for the current month', () => {
    const older = fee({ id: 'older', referenceYear: 2025, referenceMonth: 11 });
    const newer = fee({ id: 'newer', referenceYear: 2026, referenceMonth: 1 });

    expect(pickMyMonthlyFeeForHome([older, newer], now)?.id).toBe('newer');
  });

  it('breaks a year tie by month', () => {
    const earlier = fee({ id: 'earlier', referenceYear: 2025, referenceMonth: 6 });
    const later = fee({ id: 'later', referenceYear: 2025, referenceMonth: 10 });

    expect(pickMyMonthlyFeeForHome([earlier, later], now)?.id).toBe('later');
  });
});
