import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, spacing } from '@/theme';

export interface DividerProps extends ViewProps {
  inset?: boolean;
}

export function Divider({ inset = false, style, ...rest }: DividerProps) {
  return <View style={[styles.divider, inset && styles.inset, style]} {...rest} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  inset: {
    marginLeft: spacing.lg,
  },
});
