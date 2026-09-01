import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { buildAdminAlertLines } from './build-admin-alert-lines';

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return { alerts: {}, ...overrides };
}

describe('buildAdminAlertLines', () => {
  it('returns no lines when everything is zero/absent', () => {
    expect(buildAdminAlertLines(dashboard({ alerts: { pendingConfirmations: 0 } }), 'BRL')).toEqual([]);
  });

  it('adds a pendingConfirmations line only when greater than zero', () => {
    const lines = buildAdminAlertLines(dashboard({ alerts: { pendingConfirmations: 2 } }), 'BRL');

    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toBe('⚠️ 2 confirmações pendentes');
  });

  it('singularizes "confirmação pendente" for exactly one', () => {
    const lines = buildAdminAlertLines(dashboard({ alerts: { pendingConfirmations: 1 } }), 'BRL');

    expect(lines[0]!.text).toBe('⚠️ 1 confirmação pendente');
  });

  it('adds a money line from finance.pending, formatted in the given currency', () => {
    const lines = buildAdminAlertLines(
      dashboard({ finance: { referenceYear: 2026, referenceMonth: 8, expected: '300.00', received: '140.00', pending: '160.00', adHoc: '0.00' } }),
      'BRL',
    );

    expect(lines[0]!.text).toMatch(/^💰 R\$\s?160,00 pendentes$/);
  });

  it('appends the overdue count in parentheses when pendingCharges is present and positive', () => {
    const lines = buildAdminAlertLines(
      dashboard({
        finance: { referenceYear: 2026, referenceMonth: 8, expected: '300.00', received: '140.00', pending: '160.00', adHoc: '0.00' },
        alerts: { pendingCharges: 2 },
      }),
      'BRL',
    );

    expect(lines[0]!.text).toMatch(/\(2 vencidas\)$/);
  });

  it('never shows a money line when finance.pending is zero', () => {
    const lines = buildAdminAlertLines(
      dashboard({ finance: { referenceYear: 2026, referenceMonth: 8, expected: '300.00', received: '300.00', pending: '0.00', adHoc: '0.00' } }),
      'BRL',
    );

    expect(lines).toEqual([]);
  });

  it('adds an event line whenever nextEvent is present, regardless of confirmed count', () => {
    const lines = buildAdminAlertLines(
      dashboard({ nextEvent: { id: 'e1', type: 'BARBECUE', title: 'Churrasco', startsAt: '', endsAt: '', status: 'OPEN', confirmed: 18 } }),
      'BRL',
    );

    expect(lines[0]!.text).toBe('🔥 Churrasco · 18 confirmados');
  });

  it('adds an administrativeSituations line only when greater than zero', () => {
    const lines = buildAdminAlertLines(dashboard({ alerts: { administrativeSituations: 3 } }), 'BRL');

    expect(lines[0]!.text).toBe('👥 3 interessados aguardando');
  });

  it('combines every applicable line, in a fixed order: confirmations, finance, event, admin', () => {
    const lines = buildAdminAlertLines(
      dashboard({
        finance: { referenceYear: 2026, referenceMonth: 8, expected: '300.00', received: '140.00', pending: '160.00', adHoc: '0.00' },
        nextEvent: { id: 'e1', type: 'BARBECUE', title: 'Churrasco', startsAt: '', endsAt: '', status: 'OPEN', confirmed: 18 },
        alerts: { pendingConfirmations: 2, pendingCharges: 1, administrativeSituations: 1 },
      }),
      'BRL',
    );

    expect(lines.map((l) => l.key)).toEqual(['confirmations', 'finance', 'event', 'admin']);
  });
});
