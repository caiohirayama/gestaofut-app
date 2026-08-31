/**
 * The event form collects a calendar date + start time + duration (not two
 * separate date/time-of-day pickers for start and end) — simpler input,
 * and this app has no date/time picker dependency yet. `combineDateAndTime`
 * builds the `Date` from the **device's local timezone** (the admin
 * creating the event is assumed to be in it) via the multi-arg `Date`
 * constructor, then `.toISOString()` gives a valid UTC-offset ISO string
 * for the API — no new dependency needed for this.
 */

const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateInput(value: string): boolean {
  return DATE_REGEX.test(value);
}

export function isValidTimeInput(value: string): boolean {
  return TIME_REGEX.test(value);
}

/** `date`: "DD/MM/AAAA", `time`: "HH:MM" — both already validated by the form schema; returns `null` only if malformed. */
export function combineDateAndTime(date: string, time: string): Date | null {
  const dateMatch = DATE_REGEX.exec(date);
  const timeMatch = TIME_REGEX.exec(time);
  if (!dateMatch || !timeMatch) {
    return null;
  }
  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** For pre-filling the edit form from an existing event's ISO `startsAt`. */
export function toDateInput(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function toTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Whole minutes between two ISO instants — for pre-filling the edit form's duration field. */
export function durationInMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/** `date`/`startTime`/`durationMinutes` (already schema-validated strings) → `{startsAt, endsAt}` ISO strings for the API. `null` only if the date/time turned out malformed. */
export function toEventDates(date: string, startTime: string, durationMinutes: string): { startsAt: string; endsAt: string } | null {
  const startsAt = combineDateAndTime(date, startTime);
  if (!startsAt) {
    return null;
  }
  return { startsAt: startsAt.toISOString(), endsAt: addMinutes(startsAt, Number.parseInt(durationMinutes, 10)).toISOString() };
}
