import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { queryKeys } from '@/services/api/query-keys';
import { useCancelCashTransaction, useCashBalance, useCashTransactions, useCreateManualCashExpense } from './useCashTransactions';

const GROUP_ID = 'group-1';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

const cashTransactionFixture: financeEndpoints.CashTransaction = {
  id: 'cash-1',
  groupId: GROUP_ID,
  type: 'EXPENSE',
  category: 'BALLS',
  description: null,
  amount: '60.00',
  occurredAt: '2026-03-05T00:00:00.000Z',
  createdByUserId: 'admin-1',
  paymentId: null,
  status: 'CONFIRMED',
  createdAt: '2026-03-05T00:00:00.000Z',
  cancelledAt: null,
};

describe('useCashTransactions', () => {
  it('fetches and returns the group ledger', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(financeEndpoints, 'listCashTransactions').mockResolvedValue({ cashTransactions: [cashTransactionFixture] });

    const { result } = renderHook(() => useCashTransactions(GROUP_ID), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([cashTransactionFixture]));
  });

  it('does not fetch when groupId is undefined', () => {
    const { wrapper } = makeWrapper();
    const spy = jest.spyOn(financeEndpoints, 'listCashTransactions');

    renderHook(() => useCashTransactions(undefined), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useCashBalance', () => {
  it('fetches the all-time balance', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(financeEndpoints, 'getCashBalance').mockResolvedValue({ income: '150.00', expense: '60.00', balance: '90.00' });

    const { result } = renderHook(() => useCashBalance(GROUP_ID), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ income: '150.00', expense: '60.00', balance: '90.00' }));
  });
});

describe('useCreateManualCashExpense — "+ Nova despesa" / "+ Novo lançamento"', () => {
  it('calls createManualCashExpense with the given input', async () => {
    const { wrapper } = makeWrapper();
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense').mockResolvedValue(cashTransactionFixture);

    const { result } = renderHook(() => useCreateManualCashExpense(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ category: 'BALLS', amount: '60.00', description: null, occurredAt: undefined });
    });

    expect(createSpy).toHaveBeenCalledWith(GROUP_ID, { category: 'BALLS', amount: '60.00', description: null, occurredAt: undefined });
  });

  it('invalidates the ledger and balance queries on success', async () => {
    const { wrapper, queryClient } = makeWrapper();
    jest.spyOn(financeEndpoints, 'createManualCashExpense').mockResolvedValue(cashTransactionFixture);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateManualCashExpense(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ category: 'BALLS', amount: '60.00' });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.cashTransactions(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.cashBalance(GROUP_ID));
  });
});

describe('useCancelCashTransaction — cancelamento/estorno', () => {
  it('calls cancelCashTransaction with the given id', async () => {
    const { wrapper } = makeWrapper();
    const cancelSpy = jest.spyOn(financeEndpoints, 'cancelCashTransaction').mockResolvedValue({ ...cashTransactionFixture, status: 'CANCELLED' });

    const { result } = renderHook(() => useCancelCashTransaction(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('cash-1');
    });

    expect(cancelSpy).toHaveBeenCalledWith(GROUP_ID, 'cash-1');
  });

  it('invalidates the ledger and balance queries on success', async () => {
    const { wrapper, queryClient } = makeWrapper();
    jest.spyOn(financeEndpoints, 'cancelCashTransaction').mockResolvedValue({ ...cashTransactionFixture, status: 'CANCELLED' });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelCashTransaction(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('cash-1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.cashTransactions(GROUP_ID));
    expect(invalidatedKeys).toContainEqual(queryKeys.finance.cashBalance(GROUP_ID));
  });

  it('never invalidates on failure', async () => {
    const { wrapper, queryClient } = makeWrapper();
    jest.spyOn(financeEndpoints, 'cancelCashTransaction').mockRejectedValue(new Error('boom'));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelCashTransaction(GROUP_ID), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync('cash-1')).rejects.toThrow('boom');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
