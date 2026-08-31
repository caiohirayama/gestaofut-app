import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { MatchDetailsScreen } from './MatchDetailsScreen';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ matchId: 'match-1' }),
}));

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
  groupId: 'group-1',
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function baseMatch(overrides: Partial<matchEndpoints.Match> = {}): matchEndpoints.Match {
  return {
    id: 'match-1',
    groupId: 'group-1',
    startsAt: '2026-03-04T22:00:00.000Z',
    endsAt: '2026-03-04T23:00:00.000Z',
    status: 'OPEN',
    locationName: 'Quadra Central',
    locationAddress: 'Rua das Flores, 100',
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
    id: 'participant-me',
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

function renderScreen(
  options: {
    role?: 'MEMBER' | 'ADMIN';
    match?: matchEndpoints.Match;
    participants?: matchEndpoints.MatchParticipant[];
  } = {},
) {
  const { role = 'MEMBER', match = baseMatch(), participants = [participant()] } = options;

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
    .mockResolvedValue({
      members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
    });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
  jest.spyOn(matchEndpoints, 'getMatch').mockResolvedValue(match);
  jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MatchDetailsScreen />
    </QueryClientProvider>,
  );
}

describe('MatchDetailsScreen', () => {
  it('shows date, location, capacity and the confirmed count', async () => {
    renderScreen({
      participants: [
        participant({ status: 'CONFIRMED' }),
        participant({ id: 'p2', groupMemberId: 'other', status: 'CONFIRMED' }),
      ],
    });

    // The location comes from `useMatch`; the capacity lines come from the
    // independent `useMatchParticipants` query — each is awaited on its
    // own rather than assuming one covers the other's timing.
    expect(await screen.findByText('Quadra Central')).toBeTruthy();
    expect(screen.getByText('Rua das Flores, 100')).toBeTruthy();
    expect(await screen.findByText('2 / 20 confirmados')).toBeTruthy();
    expect(await screen.findByText('0 / 2 confirmados')).toBeTruthy();
  });

  it("shows the caller's own status and confirmation buttons for an OPEN match", async () => {
    renderScreen({ participants: [participant({ status: 'PENDING' })] });

    expect(await screen.findByText('Pendente')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vou jogar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não vou' })).toBeTruthy();
  });

  it('hides confirmation buttons once the match is CLOSED, even though the status is still shown', async () => {
    renderScreen({
      match: baseMatch({ status: 'CLOSED' }),
      participants: [participant({ status: 'CONFIRMED' })],
    });

    expect(await screen.findByText('Confirmado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();
  });

  it('shows a neutral message when the caller has no participant record for this match', async () => {
    renderScreen({ participants: [] });

    expect(await screen.findByText('Você não está na lista deste jogo.')).toBeTruthy();
  });

  it('hides the admin panel for a plain MEMBER (no match.manage)', async () => {
    renderScreen({ role: 'MEMBER' });
    await screen.findByText('Sua participação');

    expect(screen.queryByText('Administração')).toBeNull();
  });

  it('shows the admin roster for an ADMIN (has match.manage)', async () => {
    renderScreen({
      role: 'ADMIN',
      participants: [
        participant({ id: 'confirmed', status: 'CONFIRMED' }),
        participant({
          id: 'goalkeeper',
          typeAtMatch: 'GOALKEEPER',
          status: 'PENDING',
          groupMemberId: 'member-me',
        }),
      ],
    });

    await waitFor(() => expect(screen.getByText('Administração')).toBeTruthy());
    expect(screen.getByText(/Confirmados \(/)).toBeTruthy();
    expect(screen.getByText(/Goleiros \(/)).toBeTruthy();
  });
});
