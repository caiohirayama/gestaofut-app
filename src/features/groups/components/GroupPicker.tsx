import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from '@/components/ui';
import type { Group } from '@/services/api/endpoints/groups';
import { spacing } from '@/theme';
import { SPORT_LABELS } from '../utils/sport-labels';

export interface GroupPickerProps {
  groups: Group[];
  onSelect: (group: Group) => void;
}

export function GroupPicker({ groups, onSelect }: GroupPickerProps) {
  return (
    <FlatList
      data={groups}
      keyExtractor={(group) => group.id}
      contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item)} accessibilityRole="button">
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{item.name}</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
                  {SPORT_LABELS[item.sportType]}
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
