import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import type { Dashboard, DashboardNextMatch } from '@/services/api/endpoints/dashboard';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { AdminHome } from './AdminHome';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const GROUP_ID = 'group-1';
const ORG_ID = 'org-1';
const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function nextMatch(overrides: Partial<DashboardNextMatch> = {}): DashboardNextMatch {
  return {
    id: 'match-1',
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T19:00:00.000Z',
    status: 'OPEN',
    locationName: 'Quadra Central',
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    confirmed: 18,
    pending: 2,
    absent: 0,
    goalkeepers: 1,
    guests: 1,
    waitlisted: 0,
    ...overrides,
  };
}

function baseDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return { alerts: {}, nextMatch: nextMatch(), ...overrides };
}

function renderAdminHome(role: 'ORGANIZER' | 'TREASURER' | 'ADMIN', dashboard: Dashboard = baseDashboard()) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: GROUP_ID, activeOrganizationId: ORG_ID });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: ORG_ID, name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: ORG_ID, userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
  });
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

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminHome groupId={GROUP_ID} dashboard={dashboard} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('AdminHome — permissions gate which quick actions appear', () => {
  it('ADMIN (has match.manage) sees every quick action, including "Compartilhar", when there is a next match', async () => {
    renderAdminHome('ADMIN');

    expect(await screen.findByRole('button', { name: 'Jogador' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagamento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy();
  });

  it('ORGANIZER (member.manage/match.manage/event.manage, no finance.manage) never sees "Pagamento", but does see "Compartilhar" (has match.manage)', async () => {
    renderAdminHome('ORGANIZER');

    expect(await screen.findByRole('button', { name: 'Jogador' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pagamento' })).toBeNull();
  });

  it('TREASURER (finance.manage only, no match.manage) never sees "Jogador", "Evento", or "Compartilhar"', async () => {
    renderAdminHome('TREASURER');

    expect(await screen.findByRole('button', { name: 'Pagamento' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Jogador' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Evento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).toBeNull();
  });

  it('"Compartilhar" is hidden even for an ADMIN when there is no next match to generate a roster for', async () => {
    renderAdminHome('ADMIN', baseDashboard({ nextMatch: null }));

    await screen.findByRole('button', { name: 'Jogador' });
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).toBeNull();
  });
});

describe('AdminHome — quick action navigation', () => {
  it('"Jogador" navigates to /add-player', async () => {
    renderAdminHome('ADMIN');
    fireEvent.press(await screen.findByRole('button', { name: 'Jogador' }));

    expect(mockPush).toHaveBeenCalledWith('/add-player');
  });

  it('"Pagamento" navigates to /finance', async () => {
    renderAdminHome('ADMIN');
    fireEvent.press(await screen.findByRole('button', { name: 'Pagamento' }));

    expect(mockPush).toHaveBeenCalledWith('/finance');
  });

  it('"Evento" navigates to /events/create', async () => {
    renderAdminHome('ADMIN');
    fireEvent.press(await screen.findByRole('button', { name: 'Evento' }));

    expect(mockPush).toHaveBeenCalledWith('/events/create');
  });

  it('"Compartilhar" navigates to the roster preview screen for the current next match — never shares directly from Home', async () => {
    renderAdminHome('ADMIN', baseDashboard({ nextMatch: nextMatch({ id: 'match-42' }) }));

    fireEvent.press(await screen.findByRole('button', { name: 'Compartilhar' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[matchId]/roster', params: { matchId: 'match-42' } });
  });
});
