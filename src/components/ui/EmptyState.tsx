import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="subtitle" style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.lg,
  },
});
