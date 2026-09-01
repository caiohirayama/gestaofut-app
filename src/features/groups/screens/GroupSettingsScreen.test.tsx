import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { GroupSettingsScreen } from './GroupSettingsScreen';

const GROUP_ID = 'group-1';
const ORG_ID = 'org-1';
const USER_ID = 'user-1';

const groupFixture: groupEndpoints.Group = {
  id: GROUP_ID,
  organizationId: ORG_ID,
  name: 'Pelada de Sábado',
  description: null,
  sportType: 'FOOTBALL',
  timezone: 'America/Sao_Paulo',
  status: 'ACTIVE',
  logoUrl: 'https://cdn.example.com/organizations/org-1/groups/group-1/logo/x.png',
  createdAt: '',
  updatedAt: '',
};

const settingsFixture: groupEndpoints.GroupSettings = {
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

function renderScreen(role: 'MEMBER' | 'ADMIN') {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: GROUP_ID, activeOrganizationId: ORG_ID });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue({
    id: USER_ID,
    name: 'Ada',
    email: 'ada@example.com',
    phone: null,
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: '',
    updatedAt: '',
  });
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: ORG_ID, name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: ORG_ID, userId: USER_ID, role, status: 'ACTIVE', joinedAt: '' }],
  });
  jest.spyOn(groupEndpoints, 'getGroup').mockResolvedValue(groupFixture);
  jest.spyOn(groupEndpoints, 'getGroupSettings').mockResolvedValue(settingsFixture);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GroupSettingsScreen />
    </QueryClientProvider>,
  );
}

describe('GroupSettingsScreen — "logo do grupo quando autorizado"', () => {
  it('shows the tappable logo picker for an ADMIN (group.update)', async () => {
    renderScreen('ADMIN');

    expect(await screen.findByRole('button', { name: 'Alterar logo do grupo' })).toBeTruthy();
  });

  it('shows a read-only logo (no picker) for a plain MEMBER without group.update, even rendered directly — the tab/route gate is UX, the API 403 is the real boundary', async () => {
    renderScreen('MEMBER');

    await screen.findByText('Configurações');
    expect(screen.queryByRole('button', { name: 'Alterar logo do grupo' })).toBeNull();
    expect(screen.getByLabelText('Pelada de Sábado')).toBeTruthy();
  });
});
