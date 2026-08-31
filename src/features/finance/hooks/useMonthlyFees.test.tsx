import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { useCancelMonthlyFee, useMonthlyFees, useWaiveMonthlyFee } from './useMonthlyFees';

const GROUP_ID = 'group-1';

function fee(overrides: Partial<financeEndpoints.MonthlyFee> = {}): financeEndpoints.MonthlyFee {
  return {
    id: 'fee-1',
    groupId: GROUP_ID,
    groupMemberId: 'member-1',
    referenceYear: 2026,
    referenceMonth: 3,
    amount: '150.00',
    dueDate: '2026-03-01',
    status: 'PENDING',
    createdAt: '2026-02-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper };
}

/**
 * Mutable server-side state (not a fixed once-only mock) so the background
 * reconciliation fetch triggered by `invalidateQueries` sees the same
 * "true" state the mutation just wrote — a static mock here would let that
 * refetch silently overwrite the optimistic patch back to the stale value,
 * exactly the failure mode this mirrors from `useMatchParticipants.test.tsx`.
 */
function fakeServer(initial: financeEndpoints.MonthlyFee) {
  let current = initial;
  return {
    listMonthlyFees: () => Promise.resolve({ monthlyFees: [current] }),
    setStatus: (updated: financeEndpoints.MonthlyFee) => {
      current = updated;
      return Promise.resolve(updated);
    },
  };
}

describe('useWaiveMonthlyFee / useCancelMonthlyFee', () => {
  it('waive patches the cached admin list instantly', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(fee({ status: 'PENDING' }));
    jest.spyOn(financeEndpoints, 'listMonthlyFees').mockImplementation(server.listMonthlyFees);
    jest.spyOn(financeEndpoints, 'waiveMonthlyFee').mockImplementation(() => server.setStatus(fee({ status: 'WAIVED' })));

    const { result: listResult } = renderHook(() => useMonthlyFees(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('PENDING'));

    const { result: mutationResult } = renderHook(() => useWaiveMonthlyFee(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('fee-1');
    });

    expect(listResult.current.data?.[0]?.status).toBe('WAIVED');
  });

  it('cancel patches the cached admin list to CANCELLED', async () => {
    const { wrapper } = makeWrapper();
    const server = fakeServer(fee());
    jest.spyOn(financeEndpoints, 'listMonthlyFees').mockImplementation(server.listMonthlyFees);
    jest.spyOn(financeEndpoints, 'cancelMonthlyFee').mockImplementation(() => server.setStatus(fee({ status: 'CANCELLED' })));

    const { result: listResult } = renderHook(() => useMonthlyFees(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toHaveLength(1));

    const { result: mutationResult } = renderHook(() => useCancelMonthlyFee(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('fee-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('CANCELLED'));
  });
});
