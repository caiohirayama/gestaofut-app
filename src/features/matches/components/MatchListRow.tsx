import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import type { Match } from '@/services/api/endpoints/matches';
import { colors, spacing } from '@/theme';
import { formatMatchWeekdayTime } from '../utils/match-datetime';
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABELS } from '../utils/match-labels';

export interface MatchListRowProps {
  match: Match;
  onPress: () => void;
}

/** Memoized: a group can accumulate many matches over time (see docs/matches.md on the API having no pagination yet) — avoid re-rendering every row on unrelated state changes. */
export const MatchListRow = memo(function MatchListRow({ match, onPress }: MatchListRowProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyStrong">{formatMatchWeekdayTime(match.startsAt)}</Text>
            {match.locationName ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {match.locationName}
              </Text>
            ) : null}
          </View>
          <Badge
            label={MATCH_STATUS_LABELS[match.status]}
            variant={MATCH_STATUS_BADGE_VARIANT[match.status]}
          />
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </Card>
    </Pressable>
  );
});
