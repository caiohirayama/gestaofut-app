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
