import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface QuickAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export interface QuickActionsRowProps {
  actions: QuickAction[];
}

/** A 2-column grid of tappable tiles, each gated by the caller's own permission before it ever reaches here — see `AdminHome`. Renders nothing when there's nothing the caller can do. */
export function QuickActionsRow({ actions }: QuickActionsRowProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View>
      <Text variant="label" color="textSecondary" style={{ marginBottom: spacing.sm }}>
        AÇÕES RÁPIDAS
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              {
                flexBasis: '47%',
                flexGrow: 1,
                alignItems: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
              pressed && { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Ionicons name={action.icon} size={22} color={colors.primary} />
            <Text variant="label" color="textPrimary">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
