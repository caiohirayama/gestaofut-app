const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

/** The device's current calendar month — used to default the dashboard's month picker. */
export function currentYearMonth(now: Date = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatMonthLabel({ year, month }: YearMonth): string {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

/** Adds `delta` months to a (year, month) pair, rolling over the year boundary in either direction. */
export function shiftYearMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBasedTotal = (month - 1) + delta;
  const normalizedMonth = ((zeroBasedTotal % 12) + 12) % 12;
  const yearOffset = Math.floor(zeroBasedTotal / 12);
  return { year: year + yearOffset, month: normalizedMonth + 1 };
}

/**
 * The "Nova despesa" form's optional `occurredAt` field: an empty string
 * means "hoje" (the caller omits the field entirely — gestaofut-api's
 * route defaults it to `new Date()`), `DD/MM/AAAA` becomes an ISO datetime,
 * and anything else is invalid.
 */
export function parseOccurredAtInput(input: string): { ok: true; isoDate: string | undefined } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, isoDate: undefined };

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return { ok: false };

  const [, day, month, year] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false };
  }
  return { ok: true, isoDate: date.toISOString() };
}
