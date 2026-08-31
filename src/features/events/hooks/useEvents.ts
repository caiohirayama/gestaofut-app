import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  type CreateEventInput,
  type Event,
  type UpdateEventInput,
} from '@/services/api/endpoints/events';
import { queryKeys } from '@/services/api/query-keys';

export function useEvents(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.list(groupId ?? ''),
    queryFn: async ({ signal }) => (await listEvents(groupId!, undefined, signal)).events,
    enabled: Boolean(groupId),
  });
}

export function useEvent(groupId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(groupId ?? '', eventId ?? ''),
    queryFn: ({ signal }) => getEvent(groupId!, eventId!, signal),
    enabled: Boolean(groupId && eventId),
  });
}

export function useCreateEvent(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(groupId, input),
    onSuccess: (event: Event) => {
      queryClient.setQueryData(queryKeys.events.detail(groupId, event.id), event);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.list(groupId) });
    },
  });
}

/** Handles both field edits and status transitions (finalizar → FINISHED, cancelar → CANCELLED). */
export function useUpdateEvent(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEventInput) => updateEvent(groupId, eventId, input),
    onSuccess: (event: Event) => {
      queryClient.setQueryData(queryKeys.events.detail(groupId, eventId), event);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.list(groupId) });
    },
  });
}
