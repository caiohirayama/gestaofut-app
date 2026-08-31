import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { queryKeys } from '@/services/api/query-keys';
import {
  useCancelMatchParticipant,
  useConfirmMatchParticipant,
  useDeclineMatchParticipant,
  useMatchParticipants,
  useRequestGuestParticipation,
} from './useMatchParticipants';

const GROUP_ID = 'group-1';
const MATCH_ID = 'match-1';

function participant(overrides: Partial<matchEndpoints.MatchParticipant> = {}): matchEndpoints.MatchParticipant {
  return {
    id: 'participant-1',
    matchId: MATCH_ID,
    groupMemberId: 'member-1',
    typeAtMatch: 'REGULAR',
    status: 'PENDING',
    confirmedAt: null,
    cancelledAt: null,
    offeredAt: null,
    offerExpiresAt: null,
    queuePosition: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

/**
 * Backs `listMatchParticipants` with mutable server-side state instead of a
 * fixed once-queue: any number of fetches (initial mount, background
 * reconciliation after invalidate, a stray extra render) all see whatever
 * is currently "true" server-side, exactly like a real backend would —
 * this is what makes the test robust to the exact call count instead of
 * asserting on it.
 */
function fakeServer(initial: matchEndpoints.MatchParticipant) {
  let current = initial;
  return {
    listMatchParticipants: () => Promise.resolve({ participants: [current] }),
    setStatus: (updated: matchEndpoints.MatchParticipant) => {
      current = updated;
      return Promise.resolve(updated);
    },
  };
}

describe('useMatchParticipants cache behavior', () => {
  it('confirm patches the cached list instantly (no waiting on a refetch round-trip) and still triggers a background reconciliation fetch', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant({ status: 'PENDING' }));
    const listSpy = jest.spyOn(matchEndpoints, 'listMatchParticipants').mockImplementation(server.listMatchParticipants);
    jest
      .spyOn(matchEndpoints, 'confirmMatchParticipant')
      .mockImplementation(() => server.setStatus(participant({ status: 'CONFIRMED', confirmedAt: '2026-01-02T00:00:00.000Z' })));

    const { result: listResult } = renderHook(() => useMatchParticipants(GROUP_ID, MATCH_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('PENDING'));
    const callsBeforeMutation = listSpy.mock.calls.length;

    const { result: mutationResult } = renderHook(() => useConfirmMatchParticipant(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    // Patched synchronously by `onSuccess`, before the background
    // reconciliation fetch below even completes — this is the "feels
    // instant" guarantee, not something that depends on the refetch.
    expect(listResult.current.data?.[0]?.status).toBe('CONFIRMED');
    await waitFor(() => expect(listSpy.mock.calls.length).toBeGreaterThan(callsBeforeMutation));
  });

  it('decline patches the cached list to DECLINED', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant());
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockImplementation(server.listMatchParticipants);
    jest.spyOn(matchEndpoints, 'declineMatchParticipant').mockImplementation(() => server.setStatus(participant({ status: 'DECLINED' })));

    const { result: listResult } = renderHook(() => useMatchParticipants(GROUP_ID, MATCH_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toBeDefined());

    const { result: mutationResult } = renderHook(() => useDeclineMatchParticipant(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('DECLINED'));
  });

  it('cancel patches the cached list to CANCELLED', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant({ status: 'CONFIRMED' }));
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockImplementation(server.listMatchParticipants);
    jest
      .spyOn(matchEndpoints, 'cancelMatchParticipant')
      .mockImplementation(() => server.setStatus(participant({ status: 'CANCELLED', cancelledAt: '2026-01-02T00:00:00.000Z' })));

    const { result: listResult } = renderHook(() => useMatchParticipants(GROUP_ID, MATCH_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CONFIRMED'));

    const { result: mutationResult } = renderHook(() => useCancelMatchParticipant(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CANCELLED'));
  });

  it("a mutation for a match keeps a different match's cached participants untouched (invalidation scoped to the right query key)", async () => {
    const { wrapper, queryClient } = makeWrapper();
    const otherMatchKey = ['groups', GROUP_ID, 'matches', 'other-match', 'participants'] as const;
    const otherMatchData = [participant({ id: 'other', matchId: 'other-match', status: 'PENDING' })];
    queryClient.setQueryData(otherMatchKey, otherMatchData);
    const server = fakeServer(participant());
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockImplementation(server.listMatchParticipants);
    jest.spyOn(matchEndpoints, 'confirmMatchParticipant').mockImplementation(() => server.setStatus(participant({ status: 'CONFIRMED' })));

    const { result: mutationResult } = renderHook(() => useConfirmMatchParticipant(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    expect(queryClient.getQueryData(otherMatchKey)).toEqual(otherMatchData);
  });
});

describe('useRequestGuestParticipation', () => {
  it('appends the server-created participant to an existing cached list', async () => {
    const { wrapper } = makeWrapper();
    // Unlike `fakeServer` (built for patching a single existing participant
    // in place), this mock tracks a growing roster — the background
    // reconciliation refetch triggered by `invalidateQueries` must also see
    // the newly created participant, or it would overwrite the optimistic
    // append with a stale list, exactly as a real backend's list endpoint
    // would once the new row exists.
    let serverRoster = [participant({ id: 'existing', status: 'CONFIRMED' })];
    jest
      .spyOn(matchEndpoints, 'listMatchParticipants')
      .mockImplementation(() => Promise.resolve({ participants: serverRoster }));
    const created = participant({ id: 'new-guest', typeAtMatch: 'GUEST', status: 'WAITLISTED', queuePosition: 1 });
    jest.spyOn(matchEndpoints, 'requestGuestParticipation').mockImplementation(() => {
      serverRoster = [...serverRoster, created];
      return Promise.resolve(created);
    });

    const { result: listResult } = renderHook(() => useMatchParticipants(GROUP_ID, MATCH_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toHaveLength(1));

    const { result: mutationResult } = renderHook(() => useRequestGuestParticipation(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync();
    });

    await waitFor(() =>
      expect(listResult.current.data?.map((p) => p.id).sort()).toEqual(['existing', 'new-guest']),
    );
  });

  it('seeds the cache with the new participant when nothing was cached yet', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const created = participant({ id: 'solo-guest', typeAtMatch: 'GUEST', status: 'CONFIRMED' });
    jest.spyOn(matchEndpoints, 'requestGuestParticipation').mockResolvedValue(created);

    const { result: mutationResult } = renderHook(() => useRequestGuestParticipation(GROUP_ID, MATCH_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync();
    });

    expect(queryClient.getQueryData(queryKeys.matches.participants(GROUP_ID, MATCH_ID))).toEqual([created]);
  });

  it('exposes isPending while the request is in flight, which the UI relies on to disable its button and guard against a double-submit', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({ participants: [] });
    let resolveRequest: (value: matchEndpoints.MatchParticipant) => void = () => {};
    jest.spyOn(matchEndpoints, 'requestGuestParticipation').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { result: mutationResult } = renderHook(() => useRequestGuestParticipation(GROUP_ID, MATCH_ID), { wrapper });

    let firstCall: Promise<matchEndpoints.MatchParticipant>;
    act(() => {
      firstCall = mutationResult.current.mutateAsync();
    });
    await waitFor(() => expect(mutationResult.current.isPending).toBe(true));

    await act(async () => {
      resolveRequest(participant({ id: 'guest', status: 'WAITLISTED' }));
      await firstCall;
    });

    await waitFor(() => expect(mutationResult.current.isPending).toBe(false));
  });
});

describe('useMatchParticipants offer-aware polling', () => {
  it('polls while a participant is OFFERED and stops once none is', async () => {
    const { wrapper } = makeWrapper();
    const listSpy = jest.spyOn(matchEndpoints, 'listMatchParticipants').mockResolvedValue({
      participants: [participant({ status: 'OFFERED', offerExpiresAt: '2026-01-01T00:30:00.000Z' })],
    });

    const { result } = renderHook(() => useMatchParticipants(GROUP_ID, MATCH_ID), { wrapper });
    await waitFor(() => expect(result.current.data?.[0]?.status).toBe('OFFERED'));

    const callsWhileOffered = listSpy.mock.calls.length;
    listSpy.mockResolvedValue({ participants: [participant({ status: 'CONFIRMED' })] });
    await waitFor(() => expect(listSpy.mock.calls.length).toBeGreaterThan(callsWhileOffered), { timeout: 10000 });

    await waitFor(() => expect(result.current.data?.[0]?.status).toBe('CONFIRMED'));
    const callsAfterResolved = listSpy.mock.calls.length;

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(listSpy.mock.calls.length).toBe(callsAfterResolved);
  }, 15000);
});
