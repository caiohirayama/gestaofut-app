import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItemInfo } from 'react-native';
import { Button, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupSettings } from '@/features/groups/hooks/useGroupSettings';
import type { CashTransaction } from '@/services/api/endpoints/finance';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { CashBalanceSummary } from '../components/CashBalanceSummary';
import { CashTransactionFilters, type CashTransactionFiltersValue } from '../components/CashTransactionFilters';
import { CashTransactionRow } from '../components/CashTransactionRow';
import { MonthPicker } from '../components/MonthPicker';
import { useCashBalance, useCashTransactions } from '../hooks/useCashTransactions';
import { computeCashMonthSummary, filterCashTransactions } from '../utils/cash-transaction-summary';
import { currentYearMonth } from '../utils/finance-datetime';

/**
 * "Caixa": saldo atual (all-time, do servidor) + entradas/saídas do mês
 * selecionado (computadas no cliente sobre a lista já buscada) + lista de
 * lançamentos filtrável por categoria/período. Reachable from
 * `FinanceScreen` (same `finance.read` gate — see gestaofut-app
 * docs/finance.md); `finance.manage` also sees "+ Nova despesa"/"+ Novo
 * lançamento".
 */
export function CashTransactionsScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: settings } = useGroupSettings(groupId ?? undefined);
  const { data: balance, isPending: isBalancePending, isError: isBalanceError, refetch: refetchBalance } = useCashBalance(groupId ?? undefined);
  const {
    data: cashTransactions,
    isPending: isListPending,
    isError: isListError,
    refetch: refetchList,
  } = useCashTransactions(groupId ?? undefined);
  const { can } = useActiveGroupPermissions();
  const canManage = can('finance.manage');

  const [month, setMonth] = useState(() => currentYearMonth());
  const [filters, setFilters] = useState<CashTransactionFiltersValue>({});

  const monthSummary = useMemo(() => computeCashMonthSummary(cashTransactions ?? [], month.year, month.month), [cashTransactions, month]);

  const items = useMemo(
    () => filterCashTransactions(cashTransactions ?? [], { ...filters, referenceYear: month.year, referenceMonth: month.month }),
    [cashTransactions, filters, month],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CashTransaction>) => (
      <CashTransactionRow groupId={groupId!} cashTransaction={item} currency={settings?.currency ?? 'BRL'} canManage={canManage} />
    ),
    [groupId, settings?.currency, canManage],
  );

  if (isBalancePending || isListPending) {
    return (
      <Screen>
        <LoadingState label="Carregando caixa..." />
      </Screen>
    );
  }

  if (isBalanceError || isListError) {
    return (
      <Screen>
        <ErrorState
          onRetry={() => {
            void refetchBalance();
            void refetchList();
          }}
        />
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
            <Text variant="title">Caixa</Text>
            <MonthPicker value={month} onChange={setMonth} />
            <CashBalanceSummary balance={balance?.balance ?? '0.00'} monthSummary={monthSummary} currency={settings?.currency ?? 'BRL'} />
            {canManage ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button label="+ Nova despesa" variant="secondary" onPress={() => router.push('/cash-transactions/create')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="+ Novo lançamento" variant="secondary" onPress={() => router.push('/cash-transactions/create')} />
                </View>
              </View>
            ) : null}
            <View>
              <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
                Lançamentos
              </Text>
              <CashTransactionFilters value={filters} onChange={setFilters} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xl }}>
            Nenhum lançamento encontrado para os filtros selecionados.
          </Text>
        }
      />
    </Screen>
  );
}
