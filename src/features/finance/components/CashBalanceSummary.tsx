import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { CashMonthSummary } from '../utils/cash-transaction-summary';
import { formatMoney } from '../utils/money';

export interface CashBalanceSummaryProps {
  /** All-time `SUM(INCOME) - SUM(EXPENSE)` from the server — never computed client-side, see gestaofut-api docs/finance.md, "CAIXA". */
  balance: string;
  monthSummary: CashMonthSummary;
  currency: string;
}

/** "Mostrar: Saldo atual; Entradas do mês; Saídas do mês" — three tiles, same shape as `FinanceDashboard`. */
export function CashBalanceSummary({ balance, monthSummary, currency }: CashBalanceSummaryProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Card style={{ flexBasis: '100%' }}>
        <Text variant="label" color="textSecondary">
          Saldo atual
        </Text>
        <Text variant="title" style={{ marginTop: spacing.xs }}>
          {formatMoney(balance, currency)}
        </Text>
      </Card>
      <Card style={{ flexBasis: '48%', flexGrow: 1 }}>
        <Text variant="label" color="textSecondary">
          Entradas do mês
        </Text>
        <Text variant="title" color="success" style={{ marginTop: spacing.xs }}>
          {formatMoney(monthSummary.income, currency)}
        </Text>
      </Card>
      <Card style={{ flexBasis: '48%', flexGrow: 1 }}>
        <Text variant="label" color="textSecondary">
          Saídas do mês
        </Text>
        <Text variant="title" color="danger" style={{ marginTop: spacing.xs }}>
          {formatMoney(monthSummary.expense, currency)}
        </Text>
      </Card>
    </View>
  );
}
