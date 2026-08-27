import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { spacing } from '@/theme';

export function MoreScreen() {
  const { signOut, isPending: isSigningOut } = useLogout();
  const { data: user, isPending: isLoadingUser } = useCurrentUser();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Mais</Text>
      </View>

      {isLoadingUser ? null : user ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text variant="bodyStrong">{user.name}</Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
            {user.email}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text variant="bodyStrong">GestãoFut</Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
          Versão 0.1.0
        </Text>
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Sair" variant="secondary" onPress={handleSignOut} loading={isSigningOut} />
      </View>
    </Screen>
  );
}
