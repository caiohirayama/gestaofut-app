import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelCharge,
  listCharges,
  listMyCharges,
  waiveCharge,
  type Charge,
} from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';

/** ADMIN (finance.read): every cobrança avulsa of the group. */
export function useCharges(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.charges(groupId ?? ''),
    queryFn: async ({ signal }) => (await listCharges(groupId!, undefined, signal)).charges,
    enabled: Boolean(groupId),
  });
}

/** "Meus avulsos" — self-service, scoped server-side to the caller. */
export function useMyCharges(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.myCharges(groupId ?? ''),
    queryFn: async ({ signal }) => (await listMyCharges(groupId!, signal)).charges,
    enabled: Boolean(groupId),
  });
}

function patchCharge(queryClient: ReturnType<typeof useQueryClient>, groupId: string, updated: Charge) {
  for (const key of [queryKeys.finance.charges(groupId), queryKeys.finance.myCharges(groupId)]) {
    queryClient.setQueryData<Charge[]>(key, (current) =>
      current?.map((charge) => (charge.id === updated.id ? updated : charge)),
    );
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.finance.charges(groupId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.finance.myCharges(groupId) });
}

export function useWaiveCharge(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) => waiveCharge(groupId, chargeId),
    onSuccess: (charge) => patchCharge(queryClient, groupId, charge),
  });
}

export function useCancelCharge(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) => cancelCharge(groupId, chargeId),
    onSuccess: (charge) => patchCharge(queryClient, groupId, charge),
  });
}
