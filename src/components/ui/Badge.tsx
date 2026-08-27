import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, variantStyles[variant]]}>
      <Text variant="label" color={textColor[variant]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.full,
  },
});

const variantStyles = StyleSheet.create({
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  neutral: { backgroundColor: colors.neutralSoft },
});

const textColor = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'textSecondary',
} as const;
