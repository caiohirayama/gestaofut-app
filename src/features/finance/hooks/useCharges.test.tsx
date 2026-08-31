import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { useCharges, useWaiveCharge } from './useCharges';

const GROUP_ID = 'group-1';

function charge(overrides: Partial<financeEndpoints.Charge> = {}): financeEndpoints.Charge {
  return {
    id: 'charge-1',
    groupId: GROUP_ID,
    groupMemberId: 'member-1',
    type: 'MANUAL',
    matchParticipantId: null,
    description: 'Uniforme',
    amount: '80.00',
    dueDate: null,
    status: 'PENDING',
    createdAt: '2026-03-01T00:00:00.000Z',
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

describe('useWaiveCharge', () => {
  it('patches the cached admin list instantly', async () => {
    const { wrapper } = makeWrapper();
    let current = charge();
    jest.spyOn(financeEndpoints, 'listCharges').mockImplementation(() => Promise.resolve({ charges: [current] }));
    jest.spyOn(financeEndpoints, 'waiveCharge').mockImplementation(() => {
      current = charge({ status: 'WAIVED' });
      return Promise.resolve(current);
    });

    const { result: listResult } = renderHook(() => useCharges(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toHaveLength(1));

    const { result: mutationResult } = renderHook(() => useWaiveCharge(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('charge-1');
    });

    expect(listResult.current.data?.[0]?.status).toBe('WAIVED');
  });
});
