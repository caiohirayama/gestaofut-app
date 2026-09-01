import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { FinanceScreen } from './FinanceScreen';

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null, avatarUrl: null,
  status: 'ACTIVE' as const,
  createdAt: '',
  updatedAt: '',
};

const groupSettingsFixture: groupEndpoints.GroupSettings = {
  groupId: 'group-1',
  defaultMatchWeekday: null,
  defaultMatchTime: null,
  defaultMatchDurationMinutes: null,
  maxRegularPlayers: null,
  maxGoalkeepers: null,
  monthlyFee: '150.00',
  guestFee: null,
  confirmationDeadlineHours: null,
  waitlistOfferTimeoutMinutes: null,
  monthlyBarbecueEnabled: false,
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  createdAt: '',
  updatedAt: '',
};

function fee(overrides: Partial<financeEndpoints.MonthlyFee> = {}): financeEndpoints.MonthlyFee {
  return {
    id: 'fee-1',
    groupId: 'group-1',
    groupMemberId: 'member-1',
    referenceYear: 2026,
    referenceMonth: 3,
    amount: '150.00',
    dueDate: '2026-03-01',
    status: 'PENDING',
    createdAt: '2026-02-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function renderScreen(
  options: {
    role?: 'MEMBER' | 'TREASURER' | 'ADMIN';
    monthlyFees?: financeEndpoints.MonthlyFee[];
    charges?: financeEndpoints.Charge[];
  } = {},
) {
  const { role = 'TREASURER', monthlyFees = [fee()], charges = [] } = options;

  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
  });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({
    members: [{ id: 'member-1', groupId: 'group-1', userId: 'user-1', membershipType: 'REGULAR', status: 'ACTIVE', joinedAt: '', leftAt: null }],
  });
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue(groupSettingsFixture);
  jest.spyOn(financeEndpoints, 'listMonthlyFees').mockResolvedValue({ monthlyFees });
  jest.spyOn(financeEndpoints, 'listCharges').mockResolvedValue({ charges });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FinanceScreen />
    </QueryClientProvider>,
  );
}

// `FinanceScreen` defaults its `MonthPicker` to the device's current month
// via `currentYearMonth()` — pinned here so it matches this file's March
// 2026 fixtures regardless of when the test suite actually runs. Mocking
// just this one export (not real/fake timers) avoids any interaction with
// React Testing Library's `findBy*`/`waitFor` polling.
jest.mock('../utils/finance-datetime', () => ({
  ...jest.requireActual('../utils/finance-datetime'),
  currentYearMonth: () => ({ year: 2026, month: 3 }),
}));

describe('FinanceScreen — ADMIN', () => {
  it('shows the dashboard totals for the current month', async () => {
    renderScreen({ monthlyFees: [fee({ status: 'PAID' }), fee({ id: 'fee-2', status: 'CANCELLED' })] });

    expect(await screen.findByText('Financeiro')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Caixa' })).toBeTruthy();
    expect(screen.getByText('Previsto')).toBeTruthy();
    expect(screen.getByText('Recebido')).toBeTruthy();
    // "Pendente" also names a status-filter chip and (depending on the
    // fixture) a row badge — the dashboard card is just one of possibly
    // several matches, not the only one.
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avulsos')).toBeTruthy();
  });

  it('lists pendências for the current month', async () => {
    renderScreen({ monthlyFees: [fee()] });

    expect(await screen.findAllByText('Mensalidade — março de 2026')).toHaveLength(1);
  });

  it('shows "Registrar pagamento" for a TREASURER (finance.manage)', async () => {
    renderScreen({ role: 'TREASURER', monthlyFees: [fee({ status: 'PENDING' })] });

    expect(await screen.findByRole('button', { name: 'Registrar pagamento' })).toBeTruthy();
  });

  it('never shows "Registrar pagamento" for a role without finance.manage, even when rendered directly (the tab gate is a UX convenience, not the security boundary — see docs/state-management.md)', async () => {
    renderScreen({ role: 'MEMBER', monthlyFees: [fee({ status: 'PENDING' })] });

    await screen.findAllByText('Mensalidade — março de 2026');
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull();
  });

  it('an empty result shows a neutral message', async () => {
    renderScreen({ monthlyFees: [], charges: [] });

    expect(await screen.findByText('Nenhum item encontrado para os filtros selecionados.')).toBeTruthy();
  });

  it('filters the pendências list by status', async () => {
    renderScreen({ monthlyFees: [fee({ id: 'paid', status: 'PAID' }), fee({ id: 'pending', status: 'PENDING' })] });
    await screen.findAllByText('Mensalidade — março de 2026');

    // The "Pago" ChipSelect option (a button) vs. the row's own "Pago"
    // status badge (not a button) — scoping by role disambiguates them.
    fireEvent.press(screen.getByRole('button', { name: 'Pago' }));

    await waitFor(() => expect(screen.getAllByText('Mensalidade — março de 2026')).toHaveLength(1));
  });
});
