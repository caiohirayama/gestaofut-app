import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useAuthStore } from '@/store/auth-store';
import { MemberHome } from './MemberHome';

const GROUP_ID = 'group-1';
const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, avatarUrl: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: GROUP_ID,
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function renderMemberHome(dashboard: Dashboard) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
  jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });
  jest.spyOn(financeEndpoints, 'listMyMonthlyFees').mockResolvedValue({ monthlyFees: [] });
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue({
    groupId: GROUP_ID,
    defaultMatchWeekday: null,
    defaultMatchTime: null,
    defaultMatchDurationMinutes: null,
    maxRegularPlayers: null,
    maxGoalkeepers: null,
    monthlyFee: null,
    guestFee: null,
    confirmationDeadlineHours: null,
    waitlistOfferTimeoutMinutes: null,
    monthlyBarbecueEnabled: false,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    createdAt: '',
    updatedAt: '',
  });
  jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({ participants: [] });
  jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({ entitlement: null });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberHome groupId={GROUP_ID} dashboard={dashboard} />
    </QueryClientProvider>,
  );
}

describe('MemberHome', () => {
  it('renders the three priority sections: próximo jogo, minha mensalidade, próximo evento', async () => {
    renderMemberHome({
      nextMatch: null,
      nextEvent: { id: 'e1', type: 'BARBECUE', title: 'Churrasco', startsAt: '', endsAt: '', status: 'OPEN', confirmed: 5 },
      alerts: {},
    });

    expect(screen.getByText('Nenhum jogo agendado.')).toBeTruthy();
    expect(await screen.findByText('Minha mensalidade')).toBeTruthy();
    expect(await screen.findByText('🔥 Churrasco')).toBeTruthy();
  });

  it('never renders a "finance" or group-wide figure — only the personal mensalidade card', async () => {
    renderMemberHome({ nextMatch: null, alerts: {} });

    await screen.findByText('Minha mensalidade');
    expect(screen.queryByText(/previsto/i)).toBeNull();
  });
});
