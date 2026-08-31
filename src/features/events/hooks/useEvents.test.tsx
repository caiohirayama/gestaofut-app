import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { queryKeys } from '@/services/api/query-keys';
import { useCreateEvent, useEvent, useEvents, useUpdateEvent } from './useEvents';

const GROUP_ID = 'group-1';

function event(overrides: Partial<eventEndpoints.Event> = {}): eventEndpoints.Event {
  return {
    id: 'event-1',
    groupId: GROUP_ID,
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    description: null,
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    locationName: null,
    status: 'DRAFT',
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

describe('useEvents / useEvent', () => {
  it('lists the group events', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({ events: [event()] });

    const { result } = renderHook(() => useEvents(GROUP_ID), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('fetches a single event', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(eventEndpoints, 'getEvent').mockResolvedValue(event());

    const { result } = renderHook(() => useEvent(GROUP_ID, 'event-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.title).toBe('Churrasco de Agosto'));
  });
});

describe('useCreateEvent', () => {
  it('seeds the detail cache and invalidates the list on success', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const created = event({ id: 'new-event' });
    jest.spyOn(eventEndpoints, 'createEvent').mockResolvedValue(created);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateEvent(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        type: 'BARBECUE',
        title: 'Churrasco de Agosto',
        startsAt: '2026-08-12T18:00:00.000Z',
        endsAt: '2026-08-12T22:00:00.000Z',
      });
    });

    expect(queryClient.getQueryData(queryKeys.events.detail(GROUP_ID, 'new-event'))).toEqual(created);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.events.list(GROUP_ID) });
  });
});

describe('useUpdateEvent', () => {
  it('patches the detail cache on a field edit', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const updated = event({ title: 'Churrasco de Setembro' });
    jest.spyOn(eventEndpoints, 'updateEvent').mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateEvent(GROUP_ID, 'event-1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ title: 'Churrasco de Setembro' });
    });

    expect(queryClient.getQueryData(queryKeys.events.detail(GROUP_ID, 'event-1'))).toEqual(updated);
  });

  it('supports a status-only transition (finalizar / cancelar)', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const finished = event({ status: 'FINISHED' });
    const updateSpy = jest.spyOn(eventEndpoints, 'updateEvent').mockResolvedValue(finished);

    const { result } = renderHook(() => useUpdateEvent(GROUP_ID, 'event-1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ status: 'FINISHED' });
    });

    expect(updateSpy).toHaveBeenCalledWith(GROUP_ID, 'event-1', { status: 'FINISHED' });
    expect(queryClient.getQueryData(queryKeys.events.detail(GROUP_ID, 'event-1'))).toEqual(finished);
  });
});
