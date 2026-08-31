import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import type { Payment } from '@/services/api/endpoints/finance';
import { spacing } from '@/theme';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../utils/finance-labels';
import { formatMoney } from '../utils/money';

const PAYMENT_STATUS_BADGE_VARIANT: Record<Payment['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'neutral',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export interface PaymentRowProps {
  payment: Payment;
  currency: string;
}

/** Read-only row for "Meus pagamentos" (and reusable for a future admin payments list) — no actions, just what happened. */
export function PaymentRow({ payment, currency }: PaymentRowProps) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</Text>
          {payment.paidAt ? (
            <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
              {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text variant="bodyStrong">{formatMoney(payment.amount, currency)}</Text>
          <Badge label={PAYMENT_STATUS_LABELS[payment.status]} variant={PAYMENT_STATUS_BADGE_VARIANT[payment.status]} />
        </View>
      </View>
    </Card>
  );
}
