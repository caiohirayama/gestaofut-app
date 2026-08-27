import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Não foi possível carregar essas informações agora.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="subtitle" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button
            label="Tentar novamente"
            variant="secondary"
            onPress={onRetry}
            fullWidth={false}
          />
        </View>
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
