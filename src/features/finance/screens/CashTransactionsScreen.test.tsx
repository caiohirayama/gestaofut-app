import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { CashTransactionsScreen } from './CashTransactionsScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null,
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

function cashTransaction(overrides: Partial<financeEndpoints.CashTransaction> = {}): financeEndpoints.CashTransaction {
  return {
    id: 'cash-1',
    groupId: 'group-1',
    type: 'EXPENSE',
    category: 'BALLS',
    description: 'Bolas novas',
    amount: '60.00',
    occurredAt: '2026-03-05T00:00:00.000Z',
    createdByUserId: 'admin-1',
    paymentId: null,
    status: 'CONFIRMED',
    createdAt: '2026-03-05T00:00:00.000Z',
    cancelledAt: null,
    ...overrides,
  };
}

function renderScreen(
  options: {
    role?: 'MEMBER' | 'TREASURER' | 'ADMIN';
    cashTransactions?: financeEndpoints.CashTransaction[];
    balance?: financeEndpoints.CashBalance;
  } = {},
) {
  const { role = 'TREASURER', cashTransactions = [cashTransaction()], balance = { income: '150.00', expense: '60.00', balance: '90.00' } } = options;

  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
  });
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue(groupSettingsFixture);
  jest.spyOn(financeEndpoints, 'listCashTransactions').mockResolvedValue({ cashTransactions });
  jest.spyOn(financeEndpoints, 'getCashBalance').mockResolvedValue(balance);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CashTransactionsScreen />
    </QueryClientProvider>,
  );
}

// `CashTransactionsScreen` defaults its `MonthPicker` to the device's
// current month via `currentYearMonth()` — pinned here so it matches this
// file's March 2026 fixtures regardless of when the suite runs.
jest.mock('../utils/finance-datetime', () => ({
  ...jest.requireActual('../utils/finance-datetime'),
  currentYearMonth: () => ({ year: 2026, month: 3 }),
}));

describe('CashTransactionsScreen — ADMIN', () => {
  it('shows the balance and month totals', async () => {
    renderScreen();

    expect(await screen.findByText('Caixa')).toBeTruthy();
    expect(screen.getByText('Saldo atual')).toBeTruthy();
    expect(screen.getByText(/90,00/)).toBeTruthy();
    expect(screen.getByText('Entradas do mês')).toBeTruthy();
    expect(screen.getByText('Saídas do mês')).toBeTruthy();
  });

  it('lists lançamentos for the current month', async () => {
    renderScreen();

    expect(await screen.findByText('Bolas novas')).toBeTruthy();
  });

  it('an empty result shows a neutral message', async () => {
    renderScreen({ cashTransactions: [] });

    expect(await screen.findByText('Nenhum lançamento encontrado para os filtros selecionados.')).toBeTruthy();
  });

  it('filters the list by categoria', async () => {
    renderScreen({
      cashTransactions: [
        cashTransaction({ id: 'balls', category: 'BALLS', description: 'Bolas novas' }),
        cashTransaction({ id: 'drinks', category: 'DRINKS', description: 'Água e isotônico' }),
      ],
    });
    await screen.findByText('Bolas novas');

    fireEvent.press(screen.getByRole('button', { name: 'Bebidas' }));

    await waitFor(() => expect(screen.queryByText('Bolas novas')).toBeNull());
    expect(screen.getByText('Água e isotônico')).toBeTruthy();
  });

  describe('PERMISSIONS: "somente finance.manage cria despesas manuais"', () => {
    it('shows "+ Nova despesa" and "+ Novo lançamento" for a TREASURER (finance.manage)', async () => {
      renderScreen({ role: 'TREASURER' });

      expect(await screen.findByRole('button', { name: '+ Nova despesa' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '+ Novo lançamento' })).toBeTruthy();
    });

    it('never shows the creation actions for a role without finance.manage, even when rendered directly (the tab gate is a UX convenience, not the security boundary)', async () => {
      renderScreen({ role: 'MEMBER' });

      await screen.findByText('Caixa');
      expect(screen.queryByRole('button', { name: '+ Nova despesa' })).toBeNull();
      expect(screen.queryByRole('button', { name: '+ Novo lançamento' })).toBeNull();
    });

    it('both creation buttons navigate to the same manual-expense form — a manual entry is always an EXPENSE', async () => {
      renderScreen({ role: 'TREASURER' });

      fireEvent.press(await screen.findByRole('button', { name: '+ Nova despesa' }));
      expect(mockPush).toHaveBeenCalledWith('/cash-transactions/create');

      fireEvent.press(screen.getByRole('button', { name: '+ Novo lançamento' }));
      expect(mockPush).toHaveBeenCalledWith('/cash-transactions/create');
    });
  });
});
