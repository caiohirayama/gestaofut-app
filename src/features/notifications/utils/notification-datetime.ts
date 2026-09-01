/** "12/08, 14:30" — compact enough for a list row. Renders in the device's local timezone, mirrors `match-datetime.ts`/`event-datetime.ts`. */
export function formatNotificationTimestamp(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}
