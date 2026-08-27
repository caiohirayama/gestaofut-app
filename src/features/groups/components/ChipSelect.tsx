import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipSelectProps<T extends string> {
  label?: string;
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}

/** Simple single-select chip row — used for enum-like fields (sportType, membershipType) without adding a picker dependency. */
export function ChipSelect<T extends string>({ label, options, value, onChange, error }: ChipSelectProps<T>) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  helper: {
    marginLeft: spacing.xs,
  },
});
