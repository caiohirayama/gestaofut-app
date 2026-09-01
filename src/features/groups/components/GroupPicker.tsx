import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Card, Text } from '@/components/ui';
import type { Group } from '@/services/api/endpoints/groups';
import { spacing } from '@/theme';
import { SPORT_LABELS } from '../utils/sport-labels';

export interface GroupPickerProps {
  groups: Group[];
  onSelect: (group: Group) => void;
}

interface GroupRowProps {
  group: Group;
  onPress: () => void;
}

/** Memoized, mirrors the row-component convention used by every other list in the app (e.g. `MatchListRow`). */
const GroupRow = memo(function GroupRow({ group, onPress }: GroupRowProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{group.name}</Text>
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
              {SPORT_LABELS[group.sportType]}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

export function GroupPicker({ groups, onSelect }: GroupPickerProps) {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Group>) => <GroupRow group={item} onPress={() => onSelect(item)} />,
    [onSelect],
  );

  return (
    <FlatList
      data={groups}
      keyExtractor={(group) => group.id}
      contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
