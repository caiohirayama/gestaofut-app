import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { GamesScreen } from './GamesScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, avatarUrl: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function match(overrides: Partial<matchEndpoints.Match> = {}): matchEndpoints.Match {
  return {
    id: 'match-1',
    groupId: 'group-1',
    startsAt: '2026-03-04T22:00:00.000Z',
    endsAt: '2026-03-04T23:00:00.000Z',
    status: 'OPEN',
    locationName: null,
    locationAddress: null,
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderScreen(matches: matchEndpoints.Match[], role: 'MEMBER' | 'ORGANIZER' | 'ADMIN' = 'MEMBER') {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest
    .spyOn(organizationEndpoints, 'listOrganizations')
    .mockResolvedValue({
      organizations: [
        { id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' },
      ],
    });
  jest
    .spyOn(organizationEndpoints, 'listOrganizationMembers')
    .mockResolvedValue({ members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }] });
  jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({ matches });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GamesScreen />
    </QueryClientProvider>,
  );
}

describe('GamesScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows upcoming matches by default, sorted soonest-first', async () => {
    renderScreen([
      match({ id: 'later', status: 'SCHEDULED', startsAt: '2026-06-01T00:00:00.000Z' }),
      match({ id: 'sooner', status: 'OPEN', startsAt: '2026-03-01T00:00:00.000Z' }),
      match({ id: 'finished', status: 'FINISHED', startsAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    expect(await screen.findByText('Confirmações abertas')).toBeTruthy();
    expect(screen.getByText('Agendado')).toBeTruthy();
    expect(screen.queryByText('Encerrado')).toBeNull();
  });

  it('switching to "Histórico" shows finished/cancelled matches instead', async () => {
    renderScreen([
      match({ id: 'open', status: 'OPEN', startsAt: '2026-03-01T00:00:00.000Z' }),
      match({ id: 'finished', status: 'FINISHED', startsAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    await screen.findByText('Confirmações abertas');

    fireEvent.press(screen.getByText('Histórico'));

    expect(await screen.findByText('Encerrado')).toBeTruthy();
    expect(screen.queryByText('Confirmações abertas')).toBeNull();
  });

  it('shows an empty message when there are no upcoming matches', async () => {
    renderScreen([]);

    expect(await screen.findByText('Nenhum jogo agendado.')).toBeTruthy();
  });

  it('navigates to the match details screen when a row is pressed', async () => {
    renderScreen([match({ id: 'match-42', status: 'OPEN' })]);
    const row = await screen.findByText('Confirmações abertas');

    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[matchId]',
      params: { matchId: 'match-42' },
    });
  });

  describe('permissions', () => {
    it('hides the "criar jogo" button for a plain MEMBER (no match.manage)', async () => {
      renderScreen([match()], 'MEMBER');
      await screen.findByText('Confirmações abertas');

      expect(screen.queryByLabelText('Criar jogo')).toBeNull();
    });

    it('shows the "criar jogo" button for an ORGANIZER (has match.manage)', async () => {
      renderScreen([match()], 'ORGANIZER');
      await waitFor(() => expect(screen.queryByLabelText('Criar jogo')).toBeTruthy());
    });

    it('pressing "criar jogo" navigates to the create screen', async () => {
      renderScreen([match()], 'ADMIN');
      await waitFor(() => expect(screen.queryByLabelText('Criar jogo')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('Criar jogo'));

      expect(mockPush).toHaveBeenCalledWith('/matches/create');
    });
  });
});
