import { currentYearMonth, formatMonthLabel, parseOccurredAtInput, shiftYearMonth } from './finance-datetime';

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

describe('parseOccurredAtInput — "Nova despesa" optional data field', () => {
  it('treats an empty string as "hoje" (no isoDate — the server defaults it)', () => {
    expect(parseOccurredAtInput('')).toEqual({ ok: true, isoDate: undefined });
    expect(parseOccurredAtInput('   ')).toEqual({ ok: true, isoDate: undefined });
  });

  it('parses a valid DD/MM/AAAA into an ISO datetime', () => {
    const result = parseOccurredAtInput('05/03/2026');
    expect(result.ok).toBe(true);
    expect(result.ok && new Date(result.isoDate!).toISOString().slice(0, 10)).toBe('2026-03-05');
  });

  it('rejects a malformed date string', () => {
    expect(parseOccurredAtInput('2026-03-05')).toEqual({ ok: false });
    expect(parseOccurredAtInput('not a date')).toEqual({ ok: false });
  });

  it('rejects a calendar-invalid date (e.g. 31/02)', () => {
    expect(parseOccurredAtInput('31/02/2026')).toEqual({ ok: false });
  });
});
