import { useMemo } from 'react';
import { View } from 'react-native';
import { Badge, Text } from '@/components/ui';
import { displayNameForMember } from '@/features/groups/utils/member-display';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { MatchParticipant } from '@/services/api/endpoints/matches';
import { spacing } from '@/theme';
import { PARTICIPANT_STATUS_BADGE_VARIANT, PARTICIPANT_STATUS_LABELS } from '../utils/match-labels';
import { buildAdminRoster } from '../utils/participant-summary';

export interface ParticipantsAdminPanelProps {
  participants: MatchParticipant[];
  /** Needed to resolve a participant's `groupMemberId` to a displayable name — `MatchParticipant` never carries `userId` directly. */
  members: GroupMember[];
  currentUserId: string | undefined;
}

/**
 * "Quando autorizado" (`match.manage`) roster view: confirmados / pendentes
 * / ausentes / goleiros / avulsos — see gestaofut-app docs/matches.md.
 * Reuses `displayNameForMember` from the `groups` feature (same id-based
 * placeholder naming already used in `MembersScreen`/`PlayerDetailScreen` —
 * the API has no user-profile lookup, see gestaofut-api docs/multi-tenancy.md).
 */
export function ParticipantsAdminPanel({
  participants,
  members,
  currentUserId,
}: ParticipantsAdminPanelProps) {
  const roster = useMemo(() => buildAdminRoster(participants), [participants]);

  function nameFor(groupMemberId: string): string {
    const member = members.find((m) => m.id === groupMemberId);
    return member ? displayNameForMember(member.userId, currentUserId) : 'Jogador desconhecido';
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <RosterSection
        title={`Confirmados (${roster.confirmed.length})`}
        participants={roster.confirmed}
        nameFor={nameFor}
      />
      <RosterSection
        title={`Pendentes (${roster.pending.length})`}
        participants={roster.pending}
        nameFor={nameFor}
        showStatus
      />
      <RosterSection
        title={`Ausentes (${roster.absent.length})`}
        participants={roster.absent}
        nameFor={nameFor}
      />
      <RosterSection
        title={`Goleiros (${roster.goalkeepers.length})`}
        participants={roster.goalkeepers}
        nameFor={nameFor}
        showStatus
      />
      <RosterSection
        title={`Avulsos (${roster.guests.length})`}
        participants={roster.guests}
        nameFor={nameFor}
        showStatus
      />
    </View>
  );
}

interface RosterSectionProps {
  title: string;
  participants: MatchParticipant[];
  nameFor: (groupMemberId: string) => string;
  showStatus?: boolean;
}

function RosterSection({ title, participants, nameFor, showStatus = false }: RosterSectionProps) {
  return (
    <View>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {participants.length === 0 ? (
        <Text variant="caption" color="textTertiary">
          Ninguém nesta lista.
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {participants.map((participant) => (
            <View
              key={participant.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {nameFor(participant.groupMemberId)}
              </Text>
              {showStatus ? (
                <Badge
                  label={PARTICIPANT_STATUS_LABELS[participant.status]}
                  variant={PARTICIPANT_STATUS_BADGE_VARIANT[participant.status]}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
