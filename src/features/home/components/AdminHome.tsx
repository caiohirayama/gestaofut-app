import { router } from 'expo-router';
import { View } from 'react-native';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { AdminAlertsCard } from './AdminAlertsCard';
import { AdminNextMatchCard } from './AdminNextMatchCard';
import { QuickActionsRow, type QuickAction } from './QuickActionsRow';

export interface AdminHomeProps {
  groupId: string;
  dashboard: Dashboard;
}

/**
 * "Administrador deve entender em segundos": jogo (com vagas/espera já
 * embutidos no próprio card), pagamentos e evento como sinais compactos, e
 * as ações mais frequentes a um toque — nunca um dashboard corporativo
 * cheio de cards pequenos. Cada ação rápida só aparece se o próprio papel
 * puder executá-la (`can(...)`), então a lista final varia de admin para
 * admin (ORGANIZER nunca vê "Pagamento", TREASURER nunca vê "Jogador"/
 * "Evento") — ver docs/home.md, "Testar diferentes permissions".
 */
export function AdminHome({ groupId, dashboard }: AdminHomeProps) {
  const { can } = useActiveGroupPermissions();
  const { data: settings } = useGroupSettings(groupId);
  const currency = settings?.currency ?? 'BRL';
  const nextMatch = dashboard.nextMatch ?? null;

  const actions: QuickAction[] = [
    can('member.manage') && { key: 'player', icon: 'person-add-outline', label: 'Jogador', onPress: () => router.push('/add-player') },
    can('finance.manage') && { key: 'payment', icon: 'cash-outline', label: 'Pagamento', onPress: () => router.push('/finance') },
    can('event.manage') && { key: 'event', icon: 'flame-outline', label: 'Evento', onPress: () => router.push('/events/create') },
    // "Compartilhar escala" hits a match.manage-gated endpoint (see gestaofut-api docs/matches.md) and needs an actual match to generate a roster for.
    can('match.manage') &&
      nextMatch && {
        key: 'share',
        icon: 'share-social-outline',
        label: 'Compartilhar',
        onPress: () => router.push({ pathname: '/matches/[matchId]/roster', params: { matchId: nextMatch.id } }),
      },
  ].filter((action): action is QuickAction => Boolean(action));

  return (
    <View style={{ gap: spacing.xl }}>
      <AdminNextMatchCard nextMatch={nextMatch} />
      <AdminAlertsCard dashboard={dashboard} currency={currency} />
      <QuickActionsRow actions={actions} />
    </View>
  );
}
