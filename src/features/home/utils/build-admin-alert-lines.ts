import { formatMoney } from '@/features/finance/utils/money';
import type { Dashboard } from '@/services/api/endpoints/dashboard';

export interface AdminAlertLine {
  key: string;
  text: string;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * The admin's compact signal list — "⚠ confirmações pendentes; 💰 pendências;
 * 🔥 evento" — never one card per line, just a short list rendered inside a
 * single card (see `AdminAlertsCard`). Every field here is optional on
 * `Dashboard` (permission-gated server-side, see gestaofut-api
 * docs/dashboard.md) — a line only appears when its data is both present
 * and actually worth flagging (never "0 pendentes").
 */
export function buildAdminAlertLines(dashboard: Dashboard, currency: string): AdminAlertLine[] {
  const lines: AdminAlertLine[] = [];

  const pendingConfirmations = dashboard.alerts.pendingConfirmations;
  if (pendingConfirmations !== undefined && pendingConfirmations > 0) {
    lines.push({
      key: 'confirmations',
      text: `⚠️ ${pendingConfirmations} ${pluralize(pendingConfirmations, 'confirmação pendente', 'confirmações pendentes')}`,
    });
  }

  if (dashboard.finance && Number(dashboard.finance.pending) > 0) {
    const overdueCount = dashboard.alerts.pendingCharges ?? 0;
    const overdueSuffix = overdueCount > 0 ? ` (${overdueCount} ${pluralize(overdueCount, 'vencida', 'vencidas')})` : '';
    lines.push({
      key: 'finance',
      text: `💰 ${formatMoney(dashboard.finance.pending, currency)} pendentes${overdueSuffix}`,
    });
  }

  if (dashboard.nextEvent) {
    lines.push({
      key: 'event',
      text: `🔥 ${dashboard.nextEvent.title} · ${dashboard.nextEvent.confirmed} ${pluralize(dashboard.nextEvent.confirmed, 'confirmado', 'confirmados')}`,
    });
  }

  const administrativeSituations = dashboard.alerts.administrativeSituations;
  if (administrativeSituations !== undefined && administrativeSituations > 0) {
    lines.push({
      key: 'admin',
      text: `👥 ${administrativeSituations} ${pluralize(administrativeSituations, 'interessado aguardando', 'interessados aguardando')}`,
    });
  }

  return lines;
}
