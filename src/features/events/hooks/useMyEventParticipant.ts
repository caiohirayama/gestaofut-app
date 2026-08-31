import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useEventParticipants } from './useEventParticipants';

/**
 * `EventParticipant` only references `groupMemberId`, not `userId` — resolves
 * "my own participation record" the same way `useMyMatchParticipant.ts`
 * does: find the caller's own `GroupMember` row, then match it against the
 * event's participant list. `undefined` means either the data is still
 * loading, or the caller genuinely has no participant record for this event
 * (e.g. they were never invited).
 */
export function useMyEventParticipant(groupId: string | undefined, eventId: string | undefined) {
  const { data: me, isPending: isMePending } = useCurrentUser();
  const { data: members, isPending: isMembersPending } = useGroupMembers(groupId);
  const participantsQuery = useEventParticipants(groupId, eventId);

  const myMember = members?.find((member) => member.userId === me?.id);
  const myParticipant = myMember
    ? participantsQuery.data?.find((participant) => participant.groupMemberId === myMember.id)
    : undefined;

  return {
    ...participantsQuery,
    data: myParticipant,
    myMember,
    isPending: participantsQuery.isPending || isMePending || isMembersPending,
  };
}
