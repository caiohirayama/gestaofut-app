import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItemInfo } from 'react-native';
import { ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { FinanceFilters, type FinanceFiltersValue } from '../components/FinanceFilters';
import { MonthPicker } from '../components/MonthPicker';
import { PendingItemRow } from '../components/PendingItemRow';
import { useCharges } from '../hooks/useCharges';
import { useMonthlyFees } from '../hooks/useMonthlyFees';
import { computeDashboardTotals, filterFinanceListItems, toFinanceListItems, type FinanceListItem } from '../utils/finance-summary';
import { currentYearMonth } from '../utils/finance-datetime';

/**
 * "ADMIN": dashboard mensal (previsto/recebido/pendente/avulsos) + lista de
 * pendências filtrável (mês/status/tipo/jogador), com "Registrar pagamento"
 * por linha para quem tem `finance.manage`. Only reachable via the
 * `finance.read`-gated tab (`app/(app)/_layout.tsx`) — see
 * gestaofut-app docs/finance.md.
 */
export function FinanceScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: settings } = useGroupSettings(groupId ?? undefined);
  const { data: monthlyFees, isPending: isFeesPending, isError: isFeesError, refetch: refetchFees } = useMonthlyFees(groupId ?? undefined);
  const { data: charges, isPending: isChargesPending, isError: isChargesError, refetch: refetchCharges } = useCharges(groupId ?? undefined);
  const { data: members } = useGroupMembers(groupId ?? undefined);
  const { data: me } = useCurrentUser();
  const { can } = useActiveGroupPermissions();
  const canManage = can('finance.manage');

  const [month, setMonth] = useState(() => currentYearMonth());
  const [filters, setFilters] = useState<FinanceFiltersValue>({});

  const totals = useMemo(
    () => computeDashboardTotals(monthlyFees ?? [], charges ?? [], month.year, month.month),
    [monthlyFees, charges, month],
  );

  const items = useMemo(() => {
    const all = toFinanceListItems(monthlyFees ?? [], charges ?? []);
    return filterFinanceListItems(all, { ...filters, referenceYear: month.year, referenceMonth: month.month });
  }, [monthlyFees, charges, filters, month]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FinanceListItem>) => (
      <PendingItemRow
        groupId={groupId!}
        item={item}
        members={members ?? []}
        currentUserId={me?.id}
        currency={settings?.currency ?? 'BRL'}
        canManage={canManage}
      />
    ),
    [groupId, members, me?.id, settings?.currency, canManage],
  );

  if (isFeesPending || isChargesPending) {
    return (
      <Screen>
        <LoadingState label="Carregando financeiro..." />
      </Screen>
    );
  }

  if (isFeesError || isChargesError) {
    return (
      <Screen>
        <ErrorState onRetry={() => { void refetchFees(); void refetchCharges(); }} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            <Text variant="title">Financeiro</Text>
            <MonthPicker value={month} onChange={setMonth} />
            <FinanceDashboard totals={totals} currency={settings?.currency ?? 'BRL'} />
            <View>
              <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
                Pendências
              </Text>
              <FinanceFilters value={filters} onChange={setFilters} members={members ?? []} currentUserId={me?.id} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xl }}>
            Nenhum item encontrado para os filtros selecionados.
          </Text>
        }
      />
    </Screen>
  );
}
