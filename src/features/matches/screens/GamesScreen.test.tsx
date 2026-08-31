import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useGroupStore } from '@/store/group-store';
import { GamesScreen } from './GamesScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

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

function renderScreen(matches: matchEndpoints.Match[]) {
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
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
      pathname: '/match/[matchId]',
      params: { matchId: 'match-42' },
    });
  });
});
