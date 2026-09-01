const WEEKDAY_LABELS = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
const MONTH_ABBREVIATIONS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** "QUARTA, 12 AGO" — the compact weekday+date header for the admin hero card. Renders in the device's local timezone, same convention as the rest of the app. */
export function formatWeekdayShortDate(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAY_LABELS[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')} ${MONTH_ABBREVIATIONS[date.getMonth()]}`;
}

/** Whether an ISO instant falls on the same local calendar day as `reference` (defaults to now) — decides "JOGO DE HOJE" vs. "PRÓXIMO JOGO". */
export function isSameLocalDay(iso: string, reference: Date = new Date()): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}
