import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useAuthStore } from '@/store/auth-store';
import { NextMatchCard } from './NextMatchCard';

const GROUP_ID = 'group-1';

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null,
  status: 'ACTIVE' as const,
  createdAt: '',
  updatedAt: '',
};

const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: GROUP_ID,
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function match(overrides: Partial<matchEndpoints.Match> = {}): matchEndpoints.Match {
  return {
    id: 'match-1',
    groupId: GROUP_ID,
    startsAt: '2026-03-04T22:00:00.000Z',
    endsAt: '2026-03-04T23:00:00.000Z',
    status: 'OPEN',
    locationName: 'Quadra Central',
    locationAddress: null,
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function participant(
  overrides: Partial<matchEndpoints.MatchParticipant> = {},
): matchEndpoints.MatchParticipant {
  return {
    id: 'participant-1',
    matchId: 'match-1',
    groupMemberId: 'member-me',
    typeAtMatch: 'REGULAR',
    status: 'PENDING',
    confirmedAt: null,
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextMatchCard groupId={GROUP_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(groupEndpoints, 'getGroup').mockResolvedValue({
    id: GROUP_ID,
    organizationId: 'org-1',
    name: 'Churras FC',
    description: null,
    sportType: 'FOOTBALL',
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
});

describe('NextMatchCard', () => {
  it('shows an empty state when there is no upcoming match', async () => {
    jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({ matches: [] });

    renderCard();

    expect(await screen.findByText('Nenhum jogo agendado')).toBeTruthy();
  });

  it('shows the weekday/time, group name, and confirmed count for an OPEN match, plus confirmation buttons', async () => {
    jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({ matches: [match()] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({
      participants: [
        participant({ id: 'p1', groupMemberId: 'member-other', status: 'CONFIRMED' }),
        participant({ id: 'p2', status: 'PENDING' }),
      ],
    });

    renderCard();

    // "Churras FC" (useGroup), the confirmed count (useMatchParticipants),
    // and the buttons (useMyMatchParticipant) are independent queries that
    // don't necessarily settle in the same tick — each assertion below
    // waits for its own data rather than assuming an earlier `findBy`
    // already covered every async dependency.
    expect(await screen.findByText('Churras FC')).toBeTruthy();
    expect(screen.getByText('Quadra Central')).toBeTruthy();
    expect(await screen.findByText('1 / 20 confirmados')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Vou jogar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não vou' })).toBeTruthy();
  });

  it('shows a status badge instead of confirmation buttons for a SCHEDULED (not yet open) match', async () => {
    jest
      .spyOn(matchEndpoints, 'listMatches')
      .mockResolvedValue({ matches: [match({ status: 'SCHEDULED' })] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });

    renderCard();

    expect(await screen.findByText('Agendado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();
  });

  it('an unlimited capacity (null) shows just the confirmed count, no denominator', async () => {
    jest
      .spyOn(matchEndpoints, 'listMatches')
      .mockResolvedValue({ matches: [match({ regularCapacity: null })] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({
      participants: [participant({ status: 'CONFIRMED' })],
    });

    renderCard();

    await waitFor(() => expect(screen.getByText('1 confirmados')).toBeTruthy());
  });

  it('shows nothing actionable when the caller has no participant record yet for an OPEN match', async () => {
    jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({ matches: [match()] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });

    renderCard();

    await screen.findByText('Churras FC');
    expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();
  });
});
