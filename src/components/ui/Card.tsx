import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type CardProps = PropsWithChildren<ViewProps>;

/** Flat, bordered surface — deliberately no shadow, matching the clean/premium brief. */
export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
