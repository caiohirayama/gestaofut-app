import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelMonthlyFee,
  listMonthlyFees,
  listMyMonthlyFees,
  waiveMonthlyFee,
  type MonthlyFee,
} from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';

/** ADMIN (finance.read): every mensalidade of the group — filtering happens client-side, see finance-summary.ts. */
export function useMonthlyFees(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.monthlyFees(groupId ?? ''),
    queryFn: async ({ signal }) => (await listMonthlyFees(groupId!, undefined, signal)).monthlyFees,
    enabled: Boolean(groupId),
  });
}

/** "Minha mensalidade" — self-service, scoped server-side to the caller (see gestaofut-api docs/finance.md, "PRIVACIDADE"). */
export function useMyMonthlyFees(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.myMonthlyFees(groupId ?? ''),
    queryFn: async ({ signal }) => (await listMyMonthlyFees(groupId!, signal)).monthlyFees,
    enabled: Boolean(groupId),
  });
}

function patchMonthlyFee(queryClient: ReturnType<typeof useQueryClient>, groupId: string, updated: MonthlyFee) {
  for (const key of [queryKeys.finance.monthlyFees(groupId), queryKeys.finance.myMonthlyFees(groupId)]) {
    queryClient.setQueryData<MonthlyFee[]>(key, (current) =>
      current?.map((fee) => (fee.id === updated.id ? updated : fee)),
    );
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.finance.monthlyFees(groupId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.finance.myMonthlyFees(groupId) });
}

export function useWaiveMonthlyFee(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => waiveMonthlyFee(groupId, feeId),
    onSuccess: (fee) => patchMonthlyFee(queryClient, groupId, fee),
  });
}

export function useCancelMonthlyFee(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => cancelMonthlyFee(groupId, feeId),
    onSuccess: (fee) => patchMonthlyFee(queryClient, groupId, fee),
  });
}
