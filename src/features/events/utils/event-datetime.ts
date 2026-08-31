/** Renders in the device's local timezone — the API returns TIMESTAMPTZ (UTC-normalized), mirrors `match-datetime.ts`. */
export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "12/08" — the compact date used on the Home highlight card. */
export function formatEventShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
