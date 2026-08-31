import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelEventParticipant,
  confirmEventParticipant,
  declineEventParticipant,
  inviteEventParticipant,
  listEventParticipants,
  markEventParticipantAttended,
  markEventParticipantNoShow,
  type EventParticipant,
} from '@/services/api/endpoints/events';
import { queryKeys } from '@/services/api/query-keys';

export function useEventParticipants(groupId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.participants(groupId ?? '', eventId ?? ''),
    queryFn: async ({ signal }) => (await listEventParticipants(groupId!, eventId!, signal)).participants,
    enabled: Boolean(groupId && eventId),
  });
}

/** Patches the cached participants array with the server's authoritative response, mirrors `useMatchParticipants.ts`'s `patchParticipant`. */
function patchParticipant(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  eventId: string,
  updated: EventParticipant,
) {
  const key = queryKeys.events.participants(groupId, eventId);
  queryClient.setQueryData<EventParticipant[]>(key, (current) =>
    current?.map((participant) => (participant.id === updated.id ? updated : participant)),
  );
  void queryClient.invalidateQueries({ queryKey: key });
}

export function useInviteEventParticipant(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupMemberId: string) => inviteEventParticipant(groupId, eventId, groupMemberId),
    onSuccess: (participant) => {
      const key = queryKeys.events.participants(groupId, eventId);
      queryClient.setQueryData<EventParticipant[]>(key, (current) =>
        current ? [...current, participant] : [participant],
      );
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useConfirmEventParticipant(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => confirmEventParticipant(groupId, eventId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, eventId, participant),
  });
}

export function useDeclineEventParticipant(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => declineEventParticipant(groupId, eventId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, eventId, participant),
  });
}

export function useCancelEventParticipant(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => cancelEventParticipant(groupId, eventId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, eventId, participant),
  });
}

export function useMarkEventParticipantAttended(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => markEventParticipantAttended(groupId, eventId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, eventId, participant),
  });
}

export function useMarkEventParticipantNoShow(groupId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => markEventParticipantNoShow(groupId, eventId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, eventId, participant),
  });
}
