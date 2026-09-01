import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import { useMyMonthlyFees } from '@/features/finance/hooks/useMonthlyFees';
import { FINANCE_STATUS_BADGE_VARIANT, FINANCE_STATUS_LABELS } from '@/features/finance/utils/finance-labels';
import { formatMoney } from '@/features/finance/utils/money';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import { spacing } from '@/theme';
import { pickMyMonthlyFeeForHome } from '../utils/pick-my-monthly-fee';

export interface MemberMonthlyFeeCardProps {
  groupId: string;
}

/**
 * "Minha mensalidade" — always the caller's own record (`.../me`), never a
 * group-wide figure (that's `finance.read`-gated on the dashboard and
 * never shown to a plain MEMBER). Independent of the dashboard's `finance`
 * section entirely — see gestaofut-api docs/finance.md, "PRIVACIDADE".
 */
export function MemberMonthlyFeeCard({ groupId }: MemberMonthlyFeeCardProps) {
  const { data: fees } = useMyMonthlyFees(groupId);
  const { data: settings } = useGroupSettings(groupId);
  const currency = settings?.currency ?? 'BRL';
  const fee = pickMyMonthlyFeeForHome(fees ?? []);

  return (
    <Card>
      <Text variant="bodyStrong">Minha mensalidade</Text>
      {fee ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
          <Text variant="title">{formatMoney(fee.amount, currency)}</Text>
          <Badge label={FINANCE_STATUS_LABELS[fee.status]} variant={FINANCE_STATUS_BADGE_VARIANT[fee.status]} />
        </View>
      ) : (
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
          Nenhuma mensalidade registrada ainda.
        </Text>
      )}
      <Text
        variant="label"
        color="primary"
        style={{ marginTop: spacing.md }}
        onPress={() => router.push('/my-finance')}
        accessibilityRole="button"
      >
        Ver meu financeiro
      </Text>
    </Card>
  );
}
