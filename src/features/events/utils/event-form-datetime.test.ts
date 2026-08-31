import {
  addMinutes,
  combineDateAndTime,
  durationInMinutes,
  isValidDateInput,
  isValidTimeInput,
  toDateInput,
  toEventDates,
  toTimeInput,
} from './event-form-datetime';

describe('isValidDateInput / isValidTimeInput', () => {
  it('accepts DD/MM/AAAA and HH:MM', () => {
    expect(isValidDateInput('12/08/2026')).toBe(true);
    expect(isValidTimeInput('18:30')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidDateInput('2026-08-12')).toBe(false);
    expect(isValidDateInput('12/8/2026')).toBe(false);
    expect(isValidTimeInput('25:00')).toBe(false);
    expect(isValidTimeInput('18:60')).toBe(false);
    expect(isValidTimeInput('7:30')).toBe(false);
  });
});

describe('combineDateAndTime', () => {
  it('builds a local Date from date + time', () => {
    const result = combineDateAndTime('12/08/2026', '18:30');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(7);
    expect(result?.getDate()).toBe(12);
    expect(result?.getHours()).toBe(18);
    expect(result?.getMinutes()).toBe(30);
  });

  it('returns null for malformed date or time', () => {
    expect(combineDateAndTime('bad', '18:30')).toBeNull();
    expect(combineDateAndTime('12/08/2026', 'bad')).toBeNull();
  });
});

describe('addMinutes', () => {
  it('advances a Date by the given number of minutes', () => {
    const start = new Date(2026, 7, 12, 18, 0);
    const end = addMinutes(start, 90);
    expect(end.getHours()).toBe(19);
    expect(end.getMinutes()).toBe(30);
  });
});

describe('toDateInput / toTimeInput', () => {
  it('formats an ISO string back into DD/MM/AAAA and HH:MM using local time', () => {
    const date = new Date(2026, 7, 12, 18, 30);
    expect(toDateInput(date.toISOString())).toBe('12/08/2026');
    expect(toTimeInput(date.toISOString())).toBe('18:30');
  });
});

describe('durationInMinutes', () => {
  it('computes whole minutes between two ISO instants', () => {
    const start = new Date(2026, 7, 12, 18, 0).toISOString();
    const end = new Date(2026, 7, 12, 20, 30).toISOString();
    expect(durationInMinutes(start, end)).toBe(150);
  });
});

describe('toEventDates', () => {
  it('combines date + time + duration into startsAt/endsAt ISO strings', () => {
    const result = toEventDates('12/08/2026', '18:00', '240');
    expect(result).not.toBeNull();
    expect(new Date(result!.startsAt).getHours()).toBe(18);
    expect(durationInMinutes(result!.startsAt, result!.endsAt)).toBe(240);
  });

  it('returns null when the date or time is malformed', () => {
    expect(toEventDates('bad', '18:00', '60')).toBeNull();
  });
});
