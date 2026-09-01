import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as dashboardEndpoints from '@/services/api/endpoints/dashboard';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { HomeScreen } from './HomeScreen';

const GROUP_ID = 'group-1';
const ORG_ID = 'org-1';
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

const groupSettingsFixture: groupEndpoints.GroupSettings = {
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
};

function renderScreen(role: 'MEMBER' | 'ADMIN', dashboard: dashboardEndpoints.Dashboard) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: GROUP_ID, activeOrganizationId: ORG_ID });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: ORG_ID, name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: ORG_ID, userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
  });
  jest.spyOn(dashboardEndpoints, 'getDashboard').mockResolvedValue(dashboard);
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue(groupSettingsFixture);
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
  jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });
  jest.spyOn(financeEndpoints, 'listMyMonthlyFees').mockResolvedValue({ monthlyFees: [] });
  jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({ participants: [] });
  jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({ entitlement: null });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

describe('HomeScreen', () => {
  it('shows a loading state while the dashboard is pending', () => {
    jest.spyOn(dashboardEndpoints, 'getDashboard').mockImplementation(() => new Promise(() => {}));
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    useGroupStore.setState({ activeGroupId: GROUP_ID, activeOrganizationId: ORG_ID });
    jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [] });
    jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({ members: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Olá 👋')).toBeTruthy();
  });

  it('renders AdminHome (with "AÇÕES RÁPIDAS") for a role with an elevated permission', async () => {
    renderScreen('ADMIN', { alerts: {} });

    expect(await screen.findByText('AÇÕES RÁPIDAS')).toBeTruthy();
    expect(screen.getByText('Nenhum jogo agendado')).toBeTruthy();
  });

  it('renders MemberHome (with "Minha mensalidade") for a plain MEMBER', async () => {
    renderScreen('MEMBER', { alerts: {} });

    expect(await screen.findByText('Minha mensalidade')).toBeTruthy();
    expect(screen.queryByText('AÇÕES RÁPIDAS')).toBeNull();
  });
});
