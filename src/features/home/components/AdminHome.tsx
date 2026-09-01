import { router } from 'expo-router';
import { Share, View } from 'react-native';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import { formatMatchTime } from '@/features/matches/utils/match-datetime';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { AdminAlertsCard } from './AdminAlertsCard';
import { AdminNextMatchCard } from './AdminNextMatchCard';
import { QuickActionsRow, type QuickAction } from './QuickActionsRow';
import { formatWeekdayShortDate } from '../utils/home-datetime';

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

  async function handleShare() {
    const message = nextMatch
      ? `⚽ ${formatWeekdayShortDate(nextMatch.startsAt)} às ${formatMatchTime(nextMatch.startsAt)}${
          nextMatch.locationName ? ` · ${nextMatch.locationName}` : ''
        } — ${nextMatch.confirmed}${nextMatch.regularCapacity !== null ? `/${nextMatch.regularCapacity}` : ''} confirmados.`
      : 'Ainda não há um próximo jogo agendado.';
    try {
      await Share.share({ message });
    } catch {
      // The user backing out of the native share sheet is not an error worth surfacing.
    }
  }

  const actions: QuickAction[] = [
    can('member.manage') && { key: 'player', icon: 'person-add-outline', label: 'Jogador', onPress: () => router.push('/add-player') },
    can('finance.manage') && { key: 'payment', icon: 'cash-outline', label: 'Pagamento', onPress: () => router.push('/finance') },
    can('event.manage') && { key: 'event', icon: 'flame-outline', label: 'Evento', onPress: () => router.push('/events/create') },
    { key: 'share', icon: 'share-social-outline', label: 'Compartilhar', onPress: handleShare },
  ].filter((action): action is QuickAction => Boolean(action));

  return (
    <View style={{ gap: spacing.xl }}>
      <AdminNextMatchCard nextMatch={nextMatch} />
      <AdminAlertsCard dashboard={dashboard} currency={currency} />
      <QuickActionsRow actions={actions} />
    </View>
  );
}
