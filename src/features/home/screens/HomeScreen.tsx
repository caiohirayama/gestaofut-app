import { View } from 'react-native';
import { ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { AdminHome } from '../components/AdminHome';
import { MemberHome } from '../components/MemberHome';
import { useDashboard } from '../hooks/useDashboard';

/**
 * Home is built entirely from one aggregated read (`useDashboard`, see
 * gestaofut-api docs/dashboard.md) instead of the old per-feature
 * `useNextMatch`/`useMatches`/`useNextEventCard` chain — one request
 * instead of several, and the response is already shaped by the caller's
 * own permissions (no client-side hiding of data the server didn't send).
 *
 * "Administrador deve entender em segundos" vs. "Jogador comum deve ver
 * principalmente sua participação": any role with at least one `*.manage`
 * permission beyond the MEMBER baseline gets `AdminHome`; everyone else
 * gets `MemberHome`. This mirrors the exact same permission split the
 * dashboard endpoint itself uses to decide what to compute.
 */
function useIsAdminHome(): boolean {
  const { can } = useActiveGroupPermissions();
  return can('member.manage') || can('match.manage') || can('finance.manage') || can('event.manage');
}

export function HomeScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const isAdminHome = useIsAdminHome();
  const { data: dashboard, isPending, isError, refetch } = useDashboard(groupId ?? undefined);

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Olá 👋</Text>
      </View>

      {!groupId ? null : isPending ? (
        <LoadingState label="Carregando..." />
      ) : isError || !dashboard ? (
        <ErrorState onRetry={refetch} />
      ) : isAdminHome ? (
        <AdminHome groupId={groupId} dashboard={dashboard} />
      ) : (
        <MemberHome groupId={groupId} dashboard={dashboard} />
      )}
    </Screen>
  );
}
