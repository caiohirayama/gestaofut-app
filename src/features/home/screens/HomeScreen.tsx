import { ActivityIndicator, View } from 'react-native';
import { Badge, Card, Screen, Text } from '@/components/ui';
import { NextEventCard } from '@/features/events/components/NextEventCard';
import { NextMatchCard } from '@/features/matches/components/NextMatchCard';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { useApiStatus } from '../hooks/useApiStatus';

export function HomeScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data, isPending, isError, refetch, isRefetching } = useApiStatus();

  const statusMessage = isPending
    ? 'Verificando...'
    : isError || !data
      ? 'Não foi possível falar com a API. Verifique sua conexão.'
      : `Última verificação: ${new Date(data.timestamp).toLocaleTimeString()}`;

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Olá 👋</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Bem-vindo ao GestãoFut.
        </Text>
      </View>

      {groupId ? (
        <View style={{ marginBottom: spacing.xl }}>
          <NextMatchCard groupId={groupId} />
        </View>
      ) : null}

      {groupId ? (
        <View style={{ marginBottom: spacing.xl }}>
          <NextEventCard groupId={groupId} />
        </View>
      ) : null}

      <Card>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="bodyStrong">Conexão com o servidor</Text>
          {isPending ? (
            <ActivityIndicator size="small" />
          ) : isError ? (
            <Badge label="Indisponível" variant="danger" />
          ) : (
            <Badge label="Online" variant="success" />
          )}
        </View>

        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
          {statusMessage}
        </Text>

        {isError ? (
          <Text
            variant="label"
            color="primary"
            style={{ marginTop: spacing.md }}
            onPress={() => refetch()}
            accessibilityRole="button"
          >
            {isRefetching ? 'Tentando novamente...' : 'Tentar novamente'}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}
