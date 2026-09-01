import { formatWeekdayShortDate, isSameLocalDay } from './home-datetime';

const WEEKDAY_LABELS = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
const MONTH_ABBREVIATIONS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

describe('formatWeekdayShortDate', () => {
  it('formats as "WEEKDAY, DD MON" in uppercase Portuguese, in local time', () => {
    const iso = '2026-08-12T18:00:00.000Z';
    const local = new Date(iso);
    const expected = `${WEEKDAY_LABELS[local.getDay()]}, ${String(local.getDate()).padStart(2, '0')} ${MONTH_ABBREVIATIONS[local.getMonth()]}`;

    expect(formatWeekdayShortDate(iso)).toBe(expected);
  });

  it('pads a single-digit day with a leading zero', () => {
    const iso = '2026-08-05T12:00:00.000Z';
    const local = new Date(iso);

    expect(formatWeekdayShortDate(iso)).toContain(`, ${String(local.getDate()).padStart(2, '0')} AGO`);
  });
});

describe('isSameLocalDay', () => {
  it('is true for two instants on the same local calendar day', () => {
    const reference = new Date(2026, 7, 12, 22, 0);
    expect(isSameLocalDay(new Date(2026, 7, 12, 8, 0).toISOString(), reference)).toBe(true);
  });

  it('is false for a different calendar day, even if close in time', () => {
    const reference = new Date(2026, 7, 12, 23, 59);
    expect(isSameLocalDay(new Date(2026, 7, 13, 0, 1).toISOString(), reference)).toBe(false);
  });

  it('defaults reference to now when omitted', () => {
    expect(isSameLocalDay(new Date().toISOString())).toBe(true);
  });
});
