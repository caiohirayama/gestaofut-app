import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { AvatarPicker } from '@/features/auth/components/AvatarPicker';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { useMyGroups } from '@/features/groups/hooks/useMyGroups';
import { useApiStatus } from '@/features/home/hooks/useApiStatus';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';

export function MoreScreen() {
  const { signOut, isPending: isSigningOut } = useLogout();
  const { data: user, isPending: isLoadingUser } = useCurrentUser();
  const activeGroupId = useGroupStore((state) => state.activeGroupId);
  const { data: activeGroup } = useGroup(activeGroupId ?? undefined);
  const { groups } = useMyGroups();
  const { data: apiStatus, isPending: isApiStatusPending, isError: isApiStatusError, refetch: refetchApiStatus, isRefetching: isRefetchingApiStatus } =
    useApiStatus();

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
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <AvatarPicker name={user.name} avatarUrl={user.avatarUrl} />
          <Text variant="bodyStrong" style={{ marginTop: spacing.md }}>
            {user.name}
          </Text>
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
            {user.email}
          </Text>
        </Card>
      ) : null}

      {activeGroup ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text variant="label" color="textSecondary">
            Grupo ativo
          </Text>
          <Text variant="bodyStrong" style={{ marginTop: spacing.xs }}>
            {activeGroup.name}
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Button label="Eventos" variant="secondary" onPress={() => router.push('/events')} />
            <Button label="Meu financeiro" variant="secondary" onPress={() => router.push('/my-finance')} />
            <Button label="Configurações do grupo" variant="secondary" onPress={() => router.push('/group-settings')} />
            {groups.length > 1 ? (
              <Button label="Trocar grupo" variant="ghost" onPress={() => router.push('/switch-group')} />
            ) : null}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="bodyStrong">GestãoFut</Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
          Versão 0.1.0
        </Text>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="bodyStrong">Conexão com o servidor</Text>
          {isApiStatusPending ? (
            <ActivityIndicator size="small" />
          ) : isApiStatusError ? (
            <Badge label="Indisponível" variant="danger" />
          ) : (
            <Badge label="Online" variant="success" />
          )}
        </View>

        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
          {isApiStatusPending
            ? 'Verificando...'
            : isApiStatusError || !apiStatus
              ? 'Não foi possível falar com a API. Verifique sua conexão.'
              : `Última verificação: ${new Date(apiStatus.timestamp).toLocaleTimeString()}`}
        </Text>

        {isApiStatusError ? (
          <Text
            variant="label"
            color="primary"
            style={{ marginTop: spacing.md }}
            onPress={() => refetchApiStatus()}
            accessibilityRole="button"
          >
            {isRefetchingApiStatus ? 'Tentando novamente...' : 'Tentar novamente'}
          </Text>
        ) : null}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Sair" variant="secondary" onPress={handleSignOut} loading={isSigningOut} />
      </View>
    </Screen>
  );
}
