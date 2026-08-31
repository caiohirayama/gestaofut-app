import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { queryKeys } from '@/services/api/query-keys';
import {
  useCancelEventParticipant,
  useConfirmEventParticipant,
  useDeclineEventParticipant,
  useEventParticipants,
  useInviteEventParticipant,
  useMarkEventParticipantAttended,
  useMarkEventParticipantNoShow,
} from './useEventParticipants';

const GROUP_ID = 'group-1';
const EVENT_ID = 'event-1';

function participant(overrides: Partial<eventEndpoints.EventParticipant> = {}): eventEndpoints.EventParticipant {
  return {
    id: 'participant-1',
    eventId: EVENT_ID,
    groupMemberId: 'member-1',
    status: 'INVITED',
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

function fakeServer(initial: eventEndpoints.EventParticipant) {
  let current = initial;
  return {
    listEventParticipants: () => Promise.resolve({ participants: [current] }),
    setStatus: (updated: eventEndpoints.EventParticipant) => {
      current = updated;
      return Promise.resolve(updated);
    },
  };
}

describe('useEventParticipants cache behavior', () => {
  it('confirm patches the cached list instantly and still triggers a background reconciliation fetch', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant({ status: 'INVITED' }));
    const listSpy = jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(server.listEventParticipants);
    jest
      .spyOn(eventEndpoints, 'confirmEventParticipant')
      .mockImplementation(() => server.setStatus(participant({ status: 'CONFIRMED', confirmedAt: '2026-01-02T00:00:00.000Z' })));

    const { result: listResult } = renderHook(() => useEventParticipants(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('INVITED'));
    const callsBeforeMutation = listSpy.mock.calls.length;

    const { result: mutationResult } = renderHook(() => useConfirmEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    expect(listResult.current.data?.[0]?.status).toBe('CONFIRMED');
    await waitFor(() => expect(listSpy.mock.calls.length).toBeGreaterThan(callsBeforeMutation));
  });

  it('decline patches the cached list to DECLINED', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant());
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(server.listEventParticipants);
    jest.spyOn(eventEndpoints, 'declineEventParticipant').mockImplementation(() => server.setStatus(participant({ status: 'DECLINED' })));

    const { result: listResult } = renderHook(() => useEventParticipants(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toBeDefined());

    const { result: mutationResult } = renderHook(() => useDeclineEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('DECLINED'));
  });

  it('cancel patches the cached list to CANCELLED ("Não vou mais")', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant({ status: 'CONFIRMED' }));
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(server.listEventParticipants);
    jest
      .spyOn(eventEndpoints, 'cancelEventParticipant')
      .mockImplementation(() => server.setStatus(participant({ status: 'CANCELLED', cancelledAt: '2026-01-02T00:00:00.000Z' })));

    const { result: listResult } = renderHook(() => useEventParticipants(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CONFIRMED'));

    const { result: mutationResult } = renderHook(() => useCancelEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CANCELLED'));
  });

  it('mark attended / no-show patch the cached list (admin-only actions)', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(participant({ status: 'CONFIRMED' }));
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(server.listEventParticipants);
    jest.spyOn(eventEndpoints, 'markEventParticipantAttended').mockImplementation(() => server.setStatus(participant({ status: 'ATTENDED' })));

    const { result: listResult } = renderHook(() => useEventParticipants(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CONFIRMED'));

    const { result: attendedMutation } = renderHook(() => useMarkEventParticipantAttended(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await attendedMutation.current.mutateAsync('participant-1');
    });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('ATTENDED'));

    jest.spyOn(eventEndpoints, 'markEventParticipantNoShow').mockImplementation(() => server.setStatus(participant({ status: 'NO_SHOW' })));
    const { result: noShowMutation } = renderHook(() => useMarkEventParticipantNoShow(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await noShowMutation.current.mutateAsync('participant-1');
    });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('NO_SHOW'));
  });

  it("a mutation for one event keeps a different event's cached participants untouched", async () => {
    const { wrapper, queryClient } = makeWrapper();
    const otherEventKey = ['groups', GROUP_ID, 'events', 'other-event', 'participants'] as const;
    const otherEventData = [participant({ id: 'other', eventId: 'other-event', status: 'INVITED' })];
    queryClient.setQueryData(otherEventKey, otherEventData);
    const server = fakeServer(participant());
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(server.listEventParticipants);
    jest.spyOn(eventEndpoints, 'confirmEventParticipant').mockImplementation(() => server.setStatus(participant({ status: 'CONFIRMED' })));

    const { result: mutationResult } = renderHook(() => useConfirmEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('participant-1');
    });

    expect(queryClient.getQueryData(otherEventKey)).toEqual(otherEventData);
  });
});

describe('useInviteEventParticipant', () => {
  it('appends the server-created participant to an existing cached list', async () => {
    const { wrapper } = makeWrapper();
    let serverRoster = [participant({ id: 'existing', status: 'CONFIRMED' })];
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockImplementation(() => Promise.resolve({ participants: serverRoster }));
    const created = participant({ id: 'new-invitee', status: 'INVITED' });
    jest.spyOn(eventEndpoints, 'inviteEventParticipant').mockImplementation(() => {
      serverRoster = [...serverRoster, created];
      return Promise.resolve(created);
    });

    const { result: listResult } = renderHook(() => useEventParticipants(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toHaveLength(1));

    const { result: mutationResult } = renderHook(() => useInviteEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('member-2');
    });

    await waitFor(() => expect(listResult.current.data?.map((p) => p.id).sort()).toEqual(['existing', 'new-invitee']));
  });

  it('seeds the cache with the new participant when nothing was cached yet', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const created = participant({ id: 'solo-invitee' });
    jest.spyOn(eventEndpoints, 'inviteEventParticipant').mockResolvedValue(created);

    const { result: mutationResult } = renderHook(() => useInviteEventParticipant(GROUP_ID, EVENT_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('member-2');
    });

    expect(queryClient.getQueryData(queryKeys.events.participants(GROUP_ID, EVENT_ID))).toEqual([created]);
  });
});
