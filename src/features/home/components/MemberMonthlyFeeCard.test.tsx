import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import { MemberMonthlyFeeCard } from './MemberMonthlyFeeCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const GROUP_ID = 'group-1';

function fee(overrides: Partial<financeEndpoints.MonthlyFee> = {}): financeEndpoints.MonthlyFee {
  return {
    id: 'fee-1',
    groupId: GROUP_ID,
    groupMemberId: 'member-1',
    referenceYear: new Date().getFullYear(),
    referenceMonth: new Date().getMonth() + 1,
    amount: '150.00',
    dueDate: '2026-03-01',
    status: 'PENDING',
    createdAt: '',
    paidAt: null,
    ...overrides,
  };
}

function renderCard(fees: financeEndpoints.MonthlyFee[]) {
  jest.spyOn(financeEndpoints, 'listMyMonthlyFees').mockResolvedValue({ monthlyFees: fees });
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue({
    groupId: GROUP_ID,
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

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberMonthlyFeeCard groupId={GROUP_ID} />
    </QueryClientProvider>,
  );
}

describe('MemberMonthlyFeeCard', () => {
  it('shows an empty message when there are no monthly fees yet', async () => {
    renderCard([]);

    expect(await screen.findByText('Nenhuma mensalidade registrada ainda.')).toBeTruthy();
  });

  it('shows the amount and status of the relevant fee, formatted in the group currency', async () => {
    renderCard([fee({ status: 'OVERDUE' })]);

    expect(await screen.findByText('Vencido')).toBeTruthy();
    expect(screen.getByText(/R\$\s?150,00/)).toBeTruthy();
  });

  it('"Ver meu financeiro" navigates to the personal finance screen', async () => {
    renderCard([fee()]);
    await screen.findByText(/R\$\s?150,00/);

    fireEvent.press(screen.getByText('Ver meu financeiro'));

    expect(mockPush).toHaveBeenCalledWith('/my-finance');
  });
});
