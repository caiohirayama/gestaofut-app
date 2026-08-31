import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { FinanceDashboardTotals } from '../utils/finance-summary';
import { formatMoney } from '../utils/money';

export interface FinanceDashboardProps {
  totals: FinanceDashboardTotals;
  currency: string;
}

/** "Dashboard mensal": previsto / recebido / pendente / avulsos — four equal tiles for the selected month. */
export function FinanceDashboard({ totals, currency }: FinanceDashboardProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Tile label="Previsto" amount={totals.previsto} currency={currency} />
      <Tile label="Recebido" amount={totals.recebido} currency={currency} color="success" />
      <Tile label="Pendente" amount={totals.pendente} currency={currency} color="warning" />
      <Tile label="Avulsos" amount={totals.avulsos} currency={currency} />
    </View>
  );
}

interface TileProps {
  label: string;
  amount: string;
  currency: string;
  color?: 'success' | 'warning';
}

function Tile({ label, amount, currency, color }: TileProps) {
  return (
    <Card style={{ flexBasis: '48%', flexGrow: 1 }}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Text variant="title" color={color} style={{ marginTop: spacing.xs }}>
        {formatMoney(amount, currency)}
      </Text>
    </Card>
  );
}
