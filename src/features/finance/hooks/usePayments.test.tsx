import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';
import { useRecordManualPayment } from './usePayments';

const GROUP_ID = 'group-1';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

const paymentFixture: financeEndpoints.PaymentWithAllocations = {
  id: 'payment-1',
  organizationId: 'org-1',
  groupId: GROUP_ID,
  payerUserId: 'user-1',
  amount: '150.00',
  paymentMethod: 'PIX',
  status: 'PENDING',
  paidAt: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  allocations: [{ id: 'alloc-1', paymentId: 'payment-1', monthlyFeeId: 'fee-1', chargeId: null, amount: '150.00', createdAt: '2026-03-01T00:00:00.000Z' }],
};

describe('useRecordManualPayment — "PAGAMENTO MANUAL"', () => {
  it('calls recordPayment then confirmPayment with the resulting payment id, in that order', async () => {
    const { wrapper } = makeWrapper();
    const recordSpy = jest.spyOn(financeEndpoints, 'recordPayment').mockResolvedValue(paymentFixture);
    const confirmSpy = jest.spyOn(financeEndpoints, 'confirmPayment').mockResolvedValue({ ...paymentFixture, status: 'CONFIRMED' });

    const { result } = renderHook(() => useRecordManualPayment(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        payerUserId: 'user-1',
        paymentMethod: 'PIX',
        billableType: 'MONTHLY_FEE',
        billableId: 'fee-1',
      });
    });

    expect(recordSpy).toHaveBeenCalledWith(GROUP_ID, {
      payerUserId: 'user-1',
      paymentMethod: 'PIX',
      billables: [{ type: 'MONTHLY_FEE', id: 'fee-1' }],
    });
    expect(confirmSpy).toHaveBeenCalledWith(GROUP_ID, 'payment-1');
    expect(confirmSpy.mock.invocationCallOrder[0]).toBeGreaterThan(recordSpy.mock.invocationCallOrder[0]!);
  });

  it('invalidates every finance query for the group on success', async () => {
    const { wrapper, queryClient } = makeWrapper();
    jest.spyOn(financeEndpoints, 'recordPayment').mockResolvedValue(paymentFixture);
    jest.spyOn(financeEndpoints, 'confirmPayment').mockResolvedValue({ ...paymentFixture, status: 'CONFIRMED' });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRecordManualPayment(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ payerUserId: 'user-1', paymentMethod: 'CASH', billableType: 'CHARGE', billableId: 'charge-1' });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.payments(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.myPayments(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.monthlyFees(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.myMonthlyFees(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.charges(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.myCharges(GROUP_ID));
  });

  it('never confirms if recording fails', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(financeEndpoints, 'recordPayment').mockRejectedValue(new Error('boom'));
    const confirmSpy = jest.spyOn(financeEndpoints, 'confirmPayment');

    const { result } = renderHook(() => useRecordManualPayment(GROUP_ID), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ payerUserId: 'user-1', paymentMethod: 'PIX', billableType: 'MONTHLY_FEE', billableId: 'fee-1' }),
      ).rejects.toThrow('boom');
    });

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
