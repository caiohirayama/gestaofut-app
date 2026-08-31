import { currentYearMonth, formatMonthLabel, shiftYearMonth } from './finance-datetime';

describe('formatMonthLabel', () => {
  it('formats a (year, month) pair in Portuguese', () => {
    expect(formatMonthLabel({ year: 2026, month: 3 })).toBe('Março 2026');
    expect(formatMonthLabel({ year: 2026, month: 1 })).toBe('Janeiro 2026');
    expect(formatMonthLabel({ year: 2026, month: 12 })).toBe('Dezembro 2026');
  });
});

describe('shiftYearMonth', () => {
  it('moves forward within the same year', () => {
    expect(shiftYearMonth({ year: 2026, month: 3 }, 1)).toEqual({ year: 2026, month: 4 });
  });

  it('moves backward within the same year', () => {
    expect(shiftYearMonth({ year: 2026, month: 3 }, -1)).toEqual({ year: 2026, month: 2 });
  });

  it('rolls over into the next year', () => {
    expect(shiftYearMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('rolls back into the previous year', () => {
    expect(shiftYearMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('handles a multi-year jump', () => {
    expect(shiftYearMonth({ year: 2026, month: 3 }, 13)).toEqual({ year: 2027, month: 4 });
  });
});

describe('currentYearMonth', () => {
  it('derives from the given Date', () => {
    expect(currentYearMonth(new Date('2026-03-15T00:00:00.000Z'))).toEqual({ year: 2026, month: 3 });
  });
});
