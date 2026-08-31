import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmPayment,
  listMyPayments,
  listPayments,
  recordPayment,
  type FinanceBillableType,
  type Payment,
  type PaymentMethod,
} from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';

/** ADMIN (finance.read): every payment of the group. */
export function usePayments(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.payments(groupId ?? ''),
    queryFn: async ({ signal }) => (await listPayments(groupId!, undefined, signal)).payments,
    enabled: Boolean(groupId),
  });
}

/** "Meus pagamentos" — self-service, scoped server-side by payerUserId. */
export function useMyPayments(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.myPayments(groupId ?? ''),
    queryFn: async ({ signal }) => (await listMyPayments(groupId!, signal)).payments,
    enabled: Boolean(groupId),
  });
}

export interface RecordManualPaymentInput {
  payerUserId: string;
  paymentMethod: PaymentMethod;
  billableType: FinanceBillableType;
  billableId: string;
}

/**
 * "PAGAMENTO MANUAL": one user-facing action — "Registrar pagamento" — that
 * covers both steps of the API's payment lifecycle (record, then confirm)
 * in sequence. A treasurer manually recording a receipt already means the
 * money was received; there's no separate "reconcile later" step in this
 * UI (gestaofut-api still supports a payment sitting PENDING between the
 * two calls, e.g. for a future "await bank confirmation" flow, but that's
 * not exposed here — see docs/finance.md, known simplifications).
 *
 * Every finance list is invalidated on success rather than patched in
 * place: a single payment can settle either a mensalidade or a cobrança,
 * and the dashboard/pendências views are derived from combining both lists
 * — patching each shape individually would be more fragile than a
 * background refetch for a relatively infrequent admin action.
 */
export function useRecordManualPayment(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordManualPaymentInput): Promise<Payment> => {
      const payment = await recordPayment(groupId, {
        payerUserId: input.payerUserId,
        paymentMethod: input.paymentMethod,
        billables: [{ type: input.billableType, id: input.billableId }],
      });
      return confirmPayment(groupId, payment.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.payments(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.myPayments(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.monthlyFees(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.myMonthlyFees(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.charges(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.myCharges(groupId) });
    },
  });
}
