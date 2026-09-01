import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import type { DashboardNextMatch } from '@/services/api/endpoints/dashboard';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useAuthStore } from '@/store/auth-store';
import { MemberNextMatchCard } from './MemberNextMatchCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const GROUP_ID = 'group-1';

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: GROUP_ID,
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function nextMatch(overrides: Partial<DashboardNextMatch> = {}): DashboardNextMatch {
  return {
    id: 'match-1',
    startsAt: '2026-03-04T22:00:00.000Z',
    endsAt: '2026-03-04T23:00:00.000Z',
    status: 'OPEN',
    locationName: 'Quadra Central',
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    confirmed: 1,
    pending: 0,
    absent: 0,
    goalkeepers: 0,
    guests: 0,
    waitlisted: 0,
    ...overrides,
  };
}

function participant(overrides: Partial<matchEndpoints.MatchParticipant> = {}): matchEndpoints.MatchParticipant {
  return {
    id: 'participant-1',
    matchId: 'match-1',
    groupMemberId: 'member-me',
    typeAtMatch: 'REGULAR',
    status: 'PENDING',
    confirmedAt: null,
    cancelledAt: null,
    offeredAt: null,
    offerExpiresAt: null,
    queuePosition: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard(match: DashboardNextMatch | null, participants: matchEndpoints.MatchParticipant[] = [], member = myMember) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [member] });
  jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberNextMatchCard groupId={GROUP_ID} nextMatch={match} />
    </QueryClientProvider>,
  );
}

describe('MemberNextMatchCard', () => {
  it('shows a neutral message when there is no next match', () => {
    renderCard(null);

    expect(screen.getByText('Nenhum jogo agendado.')).toBeTruthy();
  });

  it('shows weekday/time, location, confirmed/capacity, and confirmation buttons for an OPEN match', async () => {
    renderCard(nextMatch(), [participant({ status: 'PENDING' })]);

    expect(screen.getByText('Quadra Central')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Vou jogar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não vou' })).toBeTruthy();
  });

  it('shows a status badge instead of confirmation buttons for a match that is not yet OPEN', async () => {
    renderCard(nextMatch({ status: 'SCHEDULED' }), []);

    expect(await screen.findByText('Agendado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();
  });

  it('shows a neutral message when the caller has no participant record for an OPEN match', async () => {
    renderCard(nextMatch(), []);

    expect(await screen.findByText('Você não está na lista deste jogo.')).toBeTruthy();
  });

  it('offers a join button for an active GUEST with no participant record yet on an OPEN match', async () => {
    const guestMember: groupEndpoints.GroupMember = { ...myMember, membershipType: 'GUEST' };
    renderCard(nextMatch(), [], guestMember);

    expect(await screen.findByRole('button', { name: 'Vou jogar' })).toBeTruthy();
  });

  it('shows "confirmações encerradas" for a non-open match when the caller does have a participant record', async () => {
    renderCard(nextMatch({ status: 'CLOSED' }), [participant({ status: 'CONFIRMED' })]);

    expect(await screen.findByText('Confirmações encerradas para este jogo.')).toBeTruthy();
  });

  it('"Ver detalhes" navigates to the match detail screen', async () => {
    renderCard(nextMatch({ id: 'match-42' }), [participant({ status: 'PENDING' })]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Vou jogar' })).toBeTruthy());

    fireEvent.press(screen.getByText('Ver detalhes'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[matchId]', params: { matchId: 'match-42' } });
  });
});
