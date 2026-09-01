import { View } from 'react-native';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { MemberMonthlyFeeCard } from './MemberMonthlyFeeCard';
import { MemberNextEventCard } from './MemberNextEventCard';
import { MemberNextMatchCard } from './MemberNextMatchCard';

export interface MemberHomeProps {
  groupId: string;
  dashboard: Dashboard;
}

/** "Jogador comum deve ver principalmente sua participação" — in priority order: próximo jogo + minha confirmação, minha mensalidade, próximo evento. */
export function MemberHome({ groupId, dashboard }: MemberHomeProps) {
  return (
    <View style={{ gap: spacing.xl }}>
      <MemberNextMatchCard groupId={groupId} nextMatch={dashboard.nextMatch ?? null} />
      <MemberMonthlyFeeCard groupId={groupId} />
      <MemberNextEventCard groupId={groupId} nextEvent={dashboard.nextEvent ?? null} />
    </View>
  );
}
