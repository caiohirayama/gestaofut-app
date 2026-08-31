import { formatMatchDate, formatMatchTime, formatMatchWeekdayTime } from './match-datetime';

describe('formatMatchWeekdayTime', () => {
  it('formats as "WEEKDAY · HH:MM" in the device local timezone', () => {
    // 2026-03-04 is a Wednesday.
    const result = formatMatchWeekdayTime('2026-03-04T12:00:00.000Z');
    expect(result).toMatch(/^[A-ZÇÁÃ]+ · \d{2}:\d{2}$/);
    expect(result.startsWith('QUARTA')).toBe(true);
  });
});

describe('formatMatchDate', () => {
  it('formats a full date in pt-BR', () => {
    expect(formatMatchDate('2026-03-04T12:00:00.000Z')).toContain('2026');
  });
});

describe('formatMatchTime', () => {
  it('formats HH:MM', () => {
    expect(formatMatchTime('2026-03-04T12:00:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});
