import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useMatchParticipants } from './useMatchParticipants';

/**
 * `MatchParticipant` only references `groupMemberId`, not `userId` — this
 * resolves "my own participation record" by first finding the caller's own
 * `GroupMember` row (via `GET /me` + the group's member list, the same
 * derivation `MembersScreen` already does for "Você"), then matching it
 * against the match's participant list. `undefined` means either the data
 * is still loading, or the caller genuinely has no participant record for
 * this match (e.g. a GUEST who was never auto-enrolled, or the match
 * hasn't been opened yet).
 */
export function useMyMatchParticipant(groupId: string | undefined, matchId: string | undefined) {
  const { data: me, isPending: isMePending } = useCurrentUser();
  const { data: members, isPending: isMembersPending } = useGroupMembers(groupId);
  const participantsQuery = useMatchParticipants(groupId, matchId);

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
