import { View } from 'react-native';
import { Badge, Text } from '@/components/ui';
import { displayNameForMember } from '@/features/groups/utils/member-display';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { EventParticipant } from '@/services/api/endpoints/events';
import { spacing } from '@/theme';
import { EVENT_PARTICIPANT_STATUS_BADGE_VARIANT, EVENT_PARTICIPANT_STATUS_LABELS } from '../utils/event-labels';

export interface EventParticipantsPanelProps {
  participants: EventParticipant[];
  members: GroupMember[];
  currentUserId: string | undefined;
}

/** "ADMIN: visualizar participantes" — a read-only roster, no per-row admin actions requested by the current spec. */
export function EventParticipantsPanel({ participants, members, currentUserId }: EventParticipantsPanelProps) {
  function nameFor(groupMemberId: string): string {
    const member = members.find((m) => m.id === groupMemberId);
    return member ? displayNameForMember(member.userId, currentUserId) : 'Jogador desconhecido';
  }

  if (participants.length === 0) {
    return (
      <Text variant="caption" color="textTertiary">
        Ninguém foi convidado ainda.
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {participants.map((participant) => (
        <View
          key={participant.id}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
            {nameFor(participant.groupMemberId)}
          </Text>
          <Badge
            label={EVENT_PARTICIPANT_STATUS_LABELS[participant.status]}
            variant={EVENT_PARTICIPANT_STATUS_BADGE_VARIANT[participant.status]}
          />
        </View>
      ))}
    </View>
  );
}
