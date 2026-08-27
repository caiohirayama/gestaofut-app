import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from './Text';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? (
        <Text variant="body" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  label: {
    marginTop: spacing.md,
  },
});
