import { View } from 'react-native';
import { Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { PaymentRow } from '../components/PaymentRow';
import { PendingItemRow } from '../components/PendingItemRow';
import { useMyCharges } from '../hooks/useCharges';
import { useMyMonthlyFees } from '../hooks/useMonthlyFees';
import { useMyPayments } from '../hooks/usePayments';
import { filterFinanceListItems, toFinanceListItems } from '../utils/finance-summary';
import { PAYABLE_STATUSES } from '../utils/finance-labels';

/**
 * "JOGADOR": Minha mensalidade / Meus avulsos / Meus pagamentos / Minhas
 * pendências — every list here comes from a `.../me` endpoint scoped
 * server-side to the caller (`ListMyMonthlyFeesUseCase` etc., see
 * gestaofut-api docs/finance.md, "PRIVACIDADE"). There is no
 * `groupMemberId`/`payerUserId` parameter anywhere on this screen for a
 * player to tamper with — "jogador nunca pode visualizar dívida de outro"
 * is enforced by the API contract itself, not just by this screen hiding
 * the option.
 */
export function MyFinanceScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: settings } = useGroupSettings(groupId ?? undefined);
  const { data: monthlyFees, isPending: isFeesPending, isError: isFeesError, refetch: refetchFees } = useMyMonthlyFees(groupId ?? undefined);
  const { data: charges, isPending: isChargesPending, isError: isChargesError, refetch: refetchCharges } = useMyCharges(groupId ?? undefined);
  const { data: payments, isPending: isPaymentsPending, isError: isPaymentsError, refetch: refetchPayments } = useMyPayments(groupId ?? undefined);
  const { data: members } = useGroupMembers(groupId ?? undefined);
  const { data: me } = useCurrentUser();

  const currency = settings?.currency ?? 'BRL';

  if (isFeesPending || isChargesPending || isPaymentsPending) {
    return (
      <Screen>
        <LoadingState label="Carregando seu financeiro..." />
      </Screen>
    );
  }

  if (isFeesError || isChargesError || isPaymentsError) {
    return (
      <Screen>
        <ErrorState
          onRetry={() => {
            void refetchFees();
            void refetchCharges();
            void refetchPayments();
          }}
        />
      </Screen>
    );
  }

  const feeItems = toFinanceListItems(monthlyFees ?? [], []);
  const chargeItems = toFinanceListItems([], charges ?? []);
  const pendingItems = filterFinanceListItems(toFinanceListItems(monthlyFees ?? [], charges ?? []), {}).filter((item) =>
    PAYABLE_STATUSES.includes(item.status),
  );

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Meu financeiro</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Section title="Minhas pendências" items={pendingItems} groupId={groupId!} members={members ?? []} currentUserId={me?.id} currency={currency} emptyLabel="Nenhuma pendência — tudo em dia." />
        <Section title="Minha mensalidade" items={feeItems} groupId={groupId!} members={members ?? []} currentUserId={me?.id} currency={currency} emptyLabel="Nenhuma mensalidade registrada ainda." />
        <Section title="Meus avulsos" items={chargeItems} groupId={groupId!} members={members ?? []} currentUserId={me?.id} currency={currency} emptyLabel="Nenhum avulso registrado ainda." />

        <View>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
            Meus pagamentos
          </Text>
          {(payments ?? []).length === 0 ? (
            <Card>
              <Text variant="body" color="textSecondary">
                Nenhum pagamento registrado ainda.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {payments!.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} currency={currency} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

interface SectionProps {
  title: string;
  items: ReturnType<typeof toFinanceListItems>;
  groupId: string;
  members: ReturnType<typeof useGroupMembers>['data'];
  currentUserId: string | undefined;
  currency: string;
  emptyLabel: string;
}

function Section({ title, items, groupId, members, currentUserId, currency, emptyLabel }: SectionProps) {
  return (
    <View>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
        {title}
      </Text>
      {items.length === 0 ? (
        <Card>
          <Text variant="body" color="textSecondary">
            {emptyLabel}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((item) => (
            <PendingItemRow
              key={item.id}
              groupId={groupId}
              item={item}
              members={members ?? []}
              currentUserId={currentUserId}
              currency={currency}
              canManage={false}
            />
          ))}
        </View>
      )}
    </View>
  );
}
