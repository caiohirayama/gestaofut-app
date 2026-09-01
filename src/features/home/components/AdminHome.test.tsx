import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
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

function baseDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return { alerts: {}, ...overrides };
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
  it('ADMIN sees every quick action', async () => {
    renderAdminHome('ADMIN');

    expect(await screen.findByRole('button', { name: 'Jogador' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagamento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy();
  });

  it('ORGANIZER (member.manage/match.manage/event.manage, no finance.manage) never sees "Pagamento"', async () => {
    renderAdminHome('ORGANIZER');

    expect(await screen.findByRole('button', { name: 'Jogador' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Evento' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pagamento' })).toBeNull();
  });

  it('TREASURER (finance.manage only) never sees "Jogador" or "Evento"', async () => {
    renderAdminHome('TREASURER');

    expect(await screen.findByRole('button', { name: 'Pagamento' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Jogador' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Evento' })).toBeNull();
  });

  it('"Compartilhar" is always visible, regardless of role', async () => {
    renderAdminHome('TREASURER');

    expect(await screen.findByRole('button', { name: 'Compartilhar' })).toBeTruthy();
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

  it('"Compartilhar" opens the native share sheet with the next match summary', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderAdminHome(
      'ADMIN',
      baseDashboard({
        nextMatch: {
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
        },
      }),
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    const [{ message }] = shareSpy.mock.calls[0] as [{ message: string }];
    expect(message).toContain('Quadra Central');
    expect(message).toContain('18/20');
  });

  it('"Compartilhar" falls back to a generic message when there is no next match', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    renderAdminHome('ADMIN', baseDashboard({ nextMatch: null }));

    fireEvent.press(await screen.findByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    const [{ message }] = shareSpy.mock.calls[0] as [{ message: string }];
    expect(message).toBe('Ainda não há um próximo jogo agendado.');
  });
});
