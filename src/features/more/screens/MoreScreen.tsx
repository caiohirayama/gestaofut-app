import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { deleteSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';

export function MoreScreen() {
  const signOut = useAuthStore((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await deleteSecureItem(SECURE_KEYS.authToken);
    signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Mais</Text>
      </View>

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
