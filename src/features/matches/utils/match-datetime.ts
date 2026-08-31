const WEEKDAY_LABELS = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

/** Renders in the device's local timezone — the API returns TIMESTAMPTZ (UTC-normalized), and showing the viewer's own local time is the correct behavior for a consumer app. */
export function formatMatchWeekdayTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${WEEKDAY_LABELS[date.getDay()]} · ${time}`;
}

export function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMatchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
