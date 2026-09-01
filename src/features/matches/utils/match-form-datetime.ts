/**
 * The match form collects a calendar date + start time + duration (mirrors
 * `event-form-datetime.ts`) — `combineDateAndTime` builds the `Date` from
 * the **device's local timezone** (the admin creating the match is assumed
 * to be in it) via the multi-arg `Date` constructor, then `.toISOString()`
 * gives a valid UTC-offset ISO string for the API.
 */

const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

/** `date`/`startTime`/`durationMinutes` (already schema-validated strings) → `{startsAt, endsAt}` ISO strings for the API. `null` only if the date/time turned out malformed. */
export function toMatchDates(date: string, startTime: string, durationMinutes: string): { startsAt: string; endsAt: string } | null {
  const startsAt = combineDateAndTime(date, startTime);
  if (!startsAt) {
    return null;
  }
  return { startsAt: startsAt.toISOString(), endsAt: addMinutes(startsAt, Number.parseInt(durationMinutes, 10)).toISOString() };
}
