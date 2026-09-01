import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelCashTransaction,
  createManualCashExpense,
  getCashBalance,
  listCashTransactions,
  type CashTransaction,
  type CreateManualCashExpenseInput,
} from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';

/** ADMIN (finance.read): the group's whole caixa ledger — filtered/paginated client-side, see `cash-transaction-summary.ts`. */
export function useCashTransactions(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.cashTransactions(groupId ?? ''),
    queryFn: async ({ signal }) => (await listCashTransactions(groupId!, undefined, signal)).cashTransactions,
    enabled: Boolean(groupId),
  });
}

/** ADMIN (finance.read): `SUM(INCOME) - SUM(EXPENSE)`, always recomputed by the server — never patched optimistically. */
export function useCashBalance(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.cashBalance(groupId ?? ''),
    queryFn: ({ signal }) => getCashBalance(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

/** `finance.manage`: "+ Nova despesa" / "+ Novo lançamento" — both actions in this UI create the same thing, since a manual entry can only ever be an EXPENSE (see gestaofut-api docs/finance.md, "CAIXA"). */
export function useCreateManualCashExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualCashExpenseInput): Promise<CashTransaction> => createManualCashExpense(groupId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.cashTransactions(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.cashBalance(groupId) });
    },
  });
}

/** `finance.manage`: cancelamento/estorno — the server rejects a payment-linked entry (refund the payment instead), never a delete. */
export function useCancelCashTransaction(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cashTransactionId: string): Promise<CashTransaction> => cancelCashTransaction(groupId, cashTransactionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.cashTransactions(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.cashBalance(groupId) });
    },
  });
}
