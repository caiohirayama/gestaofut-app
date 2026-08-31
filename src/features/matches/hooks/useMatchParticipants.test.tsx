import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import {
  useCancelMatchParticipant,
  useConfirmMatchParticipant,
  useDeclineMatchParticipant,
  useMatchParticipants,
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
