import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { MyFinanceScreen } from './MyFinanceScreen';

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null, avatarUrl: null,
  status: 'ACTIVE' as const,
  createdAt: '',
  updatedAt: '',
};

const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: 'group-1',
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

const otherMember: groupEndpoints.GroupMember = { ...myMember, id: 'member-other', userId: 'other-user' };

function fee(overrides: Partial<financeEndpoints.MonthlyFee> = {}): financeEndpoints.MonthlyFee {
  return {
    id: 'fee-1',
    groupId: 'group-1',
    groupMemberId: 'member-me',
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

function charge(overrides: Partial<financeEndpoints.Charge> = {}): financeEndpoints.Charge {
  return {
    id: 'charge-1',
    groupId: 'group-1',
    groupMemberId: 'member-me',
    type: 'MANUAL',
    matchParticipantId: null,
    description: 'Uniforme',
    amount: '80.00',
    dueDate: null,
    status: 'PENDING',
    createdAt: '2026-03-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function payment(overrides: Partial<financeEndpoints.Payment> = {}): financeEndpoints.Payment {
  return {
    id: 'payment-1',
    organizationId: 'org-1',
    groupId: 'group-1',
    payerUserId: 'me-id',
    amount: '150.00',
    paymentMethod: 'PIX',
    status: 'CONFIRMED',
    paidAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderScreen(options: {
  myMonthlyFees?: financeEndpoints.MonthlyFee[];
  myCharges?: financeEndpoints.Charge[];
  myPayments?: financeEndpoints.Payment[];
} = {}) {
  const { myMonthlyFees = [], myCharges = [], myPayments = [] } = options;

  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember, otherMember] });
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue({
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
  });
  jest.spyOn(financeEndpoints, 'listMyMonthlyFees').mockResolvedValue({ monthlyFees: myMonthlyFees });
  jest.spyOn(financeEndpoints, 'listMyCharges').mockResolvedValue({ charges: myCharges });
  jest.spyOn(financeEndpoints, 'listMyPayments').mockResolvedValue({ payments: myPayments });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyFinanceScreen />
    </QueryClientProvider>,
  );
}

describe('MyFinanceScreen — JOGADOR', () => {
  it('shows the four sections', async () => {
    renderScreen();

    expect(await screen.findByText('Meu financeiro')).toBeTruthy();
    expect(screen.getByText('Minhas pendências')).toBeTruthy();
    expect(screen.getByText('Minha mensalidade')).toBeTruthy();
    expect(screen.getByText('Meus avulsos')).toBeTruthy();
    expect(screen.getByText('Meus pagamentos')).toBeTruthy();
  });

  it('lists my own mensalidade using the self-scoped endpoint, never the group-wide one', async () => {
    const listMonthlyFeesSpy = jest.spyOn(financeEndpoints, 'listMonthlyFees');
    renderScreen({ myMonthlyFees: [fee()] });

    // A PENDING fee legitimately renders twice: once under "Minhas
    // pendências", once under "Minha mensalidade" — not a bug, see the
    // "excluding already-PAID ones" test below for the section split.
    expect(await screen.findAllByText('Mensalidade — março de 2026')).toHaveLength(2);
    expect(listMonthlyFeesSpy).not.toHaveBeenCalled();
  });

  it('lists my own avulsos', async () => {
    renderScreen({ myCharges: [charge()] });

    expect(await screen.findAllByText('Uniforme')).toHaveLength(2);
  });

  it('lists my own payments', async () => {
    renderScreen({ myPayments: [payment()] });

    expect(await screen.findByText('PIX')).toBeTruthy();
  });

  it('shows my still-owed items under "Minhas pendências", excluding already-PAID ones', async () => {
    renderScreen({ myMonthlyFees: [fee({ status: 'OVERDUE' }), fee({ id: 'paid-fee', status: 'PAID' })] });

    // The OVERDUE fee appears under both "Minhas pendências" and "Minha
    // mensalidade" (2); the PAID one appears only under "Minha
    // mensalidade" (1) — 3 rows total, not 4, is what proves the PAID fee
    // was excluded from "Minhas pendências".
    await waitFor(() => expect(screen.getAllByText(/Mensalidade — março de 2026/)).toHaveLength(3));
  });

  it('never shows a "Registrar pagamento" action — this is a read-only, self-service view', async () => {
    renderScreen({ myMonthlyFees: [fee({ status: 'PENDING' })] });

    await screen.findAllByText('Mensalidade — março de 2026');
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull();
  });

  it('shows an empty message for a section with nothing yet', async () => {
    renderScreen();

    expect(await screen.findByText('Nenhuma mensalidade registrada ainda.')).toBeTruthy();
    expect(screen.getByText('Nenhum avulso registrado ainda.')).toBeTruthy();
    expect(screen.getByText('Nenhum pagamento registrado ainda.')).toBeTruthy();
    expect(screen.getByText('Nenhuma pendência — tudo em dia.')).toBeTruthy();
  });
});
