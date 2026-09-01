import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useAuthStore } from '@/store/auth-store';
import { useMyMatchParticipant } from './useMyMatchParticipant';

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null, avatarUrl: null,
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
  joinedAt: '2026-01-01T00:00:00.000Z',
  leftAt: null,
};

const otherMember: groupEndpoints.GroupMember = {
  ...myMember,
  id: 'member-other',
  userId: 'other-user',
};

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
    offeredAt: null,
    offerExpiresAt: null,
    queuePosition: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
});

describe('useMyMatchParticipant', () => {
  it("finds the participant record matching the caller's own GroupMember", async () => {
    jest
      .spyOn(groupEndpoints, 'listGroupMembers')
      .mockResolvedValue({ members: [otherMember, myMember] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({
      participants: [
        participant({ id: 'other-participant', groupMemberId: 'member-other' }),
        participant({ id: 'my-participant' }),
      ],
    });

    const { result } = renderHook(() => useMyMatchParticipant('group-1', 'match-1'), { wrapper });

    await waitFor(() => expect(result.current.data?.id).toBe('my-participant'));
  });

  it('resolves to undefined when the caller has no participant record for this match', async () => {
    jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });

    const { result } = renderHook(() => useMyMatchParticipant('group-1', 'match-1'), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeUndefined();
  });

  it("resolves to undefined (never someone else's) when the caller is not even a GroupMember of this group", async () => {
    jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [otherMember] });
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({
      participants: [participant({ groupMemberId: 'member-other' })],
    });

    const { result } = renderHook(() => useMyMatchParticipant('group-1', 'match-1'), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeUndefined();
  });
});
