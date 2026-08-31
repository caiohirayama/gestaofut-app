import { Alert, View } from 'react-native';
import { Badge, Button, Card, Text } from '@/components/ui';
import { displayNameForMember } from '@/features/groups/utils/member-display';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { PaymentMethod } from '@/services/api/endpoints/finance';
import { spacing } from '@/theme';
import { useRecordManualPayment } from '../hooks/usePayments';
import { FINANCE_STATUS_BADGE_VARIANT, FINANCE_STATUS_LABELS, PAYABLE_STATUSES, PAYMENT_METHOD_LABELS } from '../utils/finance-labels';
import { describeFinanceListItem, type FinanceListItem } from '../utils/finance-summary';
import { formatMoney } from '../utils/money';

export interface PendingItemRowProps {
  groupId: string;
  item: FinanceListItem;
  members: GroupMember[];
  currentUserId: string | undefined;
  currency: string;
  /** Whether the viewer has `finance.manage` — gates the "Registrar pagamento" action. */
  canManage: boolean;
}

/**
 * "PAGAMENTO MANUAL": `canManage` sees a "Registrar pagamento" action on
 * any still-payable (`PENDING`/`OVERDUE`) row. The flow is two native
 * confirmations — pick a method, then confirm the exact amount/payer —
 * satisfying "solicitar confirmação" without introducing a new modal
 * component, the same `Alert.alert` pattern already used for destructive
 * actions elsewhere (see `PlayerDetailScreen`). Double submit is prevented
 * by `Button`'s own `loading`/`disabled` (already used everywhere else in
 * this app) — a native Alert can't be double-tapped before it dismisses,
 * so no extra guard is needed for the dialogs themselves.
 */
export function PendingItemRow({ groupId, item, members, currentUserId, currency, canManage }: PendingItemRowProps) {
  const member = members.find((m) => m.id === item.groupMemberId);
  const name = member ? displayNameForMember(member.userId, currentUserId) : 'Jogador desconhecido';
  const recordPayment = useRecordManualPayment(groupId);
  const isPayable = PAYABLE_STATUSES.includes(item.status);

  function openMethodPicker() {
    if (!member) return;
    Alert.alert('Registrar pagamento', 'Selecione o método de recebimento:', [
      { text: PAYMENT_METHOD_LABELS.PIX, onPress: () => confirmAndRecord(member, 'PIX') },
      { text: PAYMENT_METHOD_LABELS.CASH, onPress: () => confirmAndRecord(member, 'CASH') },
      { text: PAYMENT_METHOD_LABELS.TRANSFER, onPress: () => confirmAndRecord(member, 'TRANSFER') },
      { text: PAYMENT_METHOD_LABELS.OTHER, onPress: () => confirmAndRecord(member, 'OTHER') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function confirmAndRecord(target: GroupMember, method: PaymentMethod) {
    Alert.alert(
      'Confirmar pagamento',
      `Registrar ${formatMoney(item.amount, currency)} via ${PAYMENT_METHOD_LABELS[method]} de ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            recordPayment.mutate({
              payerUserId: target.userId,
              paymentMethod: method,
              billableType: item.kind === 'MONTHLY_FEE' ? 'MONTHLY_FEE' : 'CHARGE',
              billableId: item.id,
            }),
        },
      ],
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: spacing.xs }}>
            {describeFinanceListItem(item)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text variant="bodyStrong">{formatMoney(item.amount, currency)}</Text>
          <Badge label={FINANCE_STATUS_LABELS[item.status]} variant={FINANCE_STATUS_BADGE_VARIANT[item.status]} />
        </View>
      </View>
      {canManage && isPayable ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Registrar pagamento"
            variant="secondary"
            onPress={openMethodPicker}
            loading={recordPayment.isPending}
            disabled={recordPayment.isPending || !member}
          />
        </View>
      ) : null}
      {recordPayment.isError ? (
        <Text variant="caption" color="danger" accessibilityRole="alert" style={{ marginTop: spacing.sm }}>
          Não foi possível registrar o pagamento. Tente novamente.
        </Text>
      ) : null}
    </Card>
  );
}
