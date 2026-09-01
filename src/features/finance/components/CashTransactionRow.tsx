import { Alert, View } from 'react-native';
import { Badge, Button, Card, Text } from '@/components/ui';
import type { CashTransaction } from '@/services/api/endpoints/finance';
import { spacing } from '@/theme';
import { useCancelCashTransaction } from '../hooks/useCashTransactions';
import { CASH_TRANSACTION_CATEGORY_LABELS, CASH_TRANSACTION_STATUS_BADGE_VARIANT, CASH_TRANSACTION_STATUS_LABELS } from '../utils/finance-labels';
import { formatMoney } from '../utils/money';

export interface CashTransactionRowProps {
  groupId: string;
  cashTransaction: CashTransaction;
  currency: string;
  /** Whether the viewer has `finance.manage` — gates the "Estornar" action. */
  canManage: boolean;
}

/**
 * "CANCELAMENTO: não permitir delete simples, usar cancelamento/estorno" —
 * this row never offers to delete anything, only "Estornar" behind a native
 * confirmation (same `Alert.alert` pattern as `PendingItemRow`'s "Registrar
 * pagamento"), and only for a `CONFIRMED`, manually recorded entry
 * (`paymentId === null`). A payment-linked INCOME row shows a hint instead
 * of a button — the server rejects a direct cancel on those (see
 * gestaofut-api docs/finance.md, "CAIXA": refund the payment instead).
 */
export function CashTransactionRow({ groupId, cashTransaction, currency, canManage }: CashTransactionRowProps) {
  const cancelCashTransaction = useCancelCashTransaction(groupId);
  const isIncome = cashTransaction.type === 'INCOME';
  const canCancel = canManage && cashTransaction.status === 'CONFIRMED' && cashTransaction.paymentId === null;

  function confirmCancel() {
    Alert.alert(
      'Estornar lançamento',
      `Estornar ${formatMoney(cashTransaction.amount, currency)} (${CASH_TRANSACTION_CATEGORY_LABELS[cashTransaction.category]})? O histórico é mantido, só deixa de contar no saldo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Estornar', style: 'destructive', onPress: () => cancelCashTransaction.mutate(cashTransaction.id) },
      ],
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {CASH_TRANSACTION_CATEGORY_LABELS[cashTransaction.category]}
          </Text>
          {cashTransaction.description ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: spacing.xs }}>
              {cashTransaction.description}
            </Text>
          ) : null}
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
            {new Date(cashTransaction.occurredAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text variant="bodyStrong" color={isIncome ? 'success' : 'danger'}>
            {isIncome ? '+' : '-'} {formatMoney(cashTransaction.amount, currency)}
          </Text>
          <Badge label={CASH_TRANSACTION_STATUS_LABELS[cashTransaction.status]} variant={CASH_TRANSACTION_STATUS_BADGE_VARIANT[cashTransaction.status]} />
        </View>
      </View>
      {canCancel ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Estornar" variant="secondary" onPress={confirmCancel} loading={cancelCashTransaction.isPending} disabled={cancelCashTransaction.isPending} />
        </View>
      ) : null}
      {canManage && cashTransaction.status === 'CONFIRMED' && cashTransaction.paymentId !== null ? (
        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
          Gerado por um pagamento — estorne o pagamento para cancelar.
        </Text>
      ) : null}
      {cancelCashTransaction.isError ? (
        <Text variant="caption" color="danger" accessibilityRole="alert" style={{ marginTop: spacing.sm }}>
          Não foi possível estornar o lançamento. Tente novamente.
        </Text>
      ) : null}
    </Card>
  );
}
