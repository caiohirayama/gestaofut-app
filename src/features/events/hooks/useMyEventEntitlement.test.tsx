import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { useMyEventEntitlement } from './useMyEventEntitlement';

const GROUP_ID = 'group-1';
const EVENT_ID = 'event-1';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe('useMyEventEntitlement', () => {
  it('resolves the entitlement when the caller has one ("Incluso na mensalidade")', async () => {
    const wrapper = makeWrapper();
    jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({
      entitlement: { id: 'ent-1', eventId: EVENT_ID, groupMemberId: 'member-1', source: 'MONTHLY_FEE_PAID', grantedAt: '2026-08-01T00:00:00.000Z', revokedAt: null },
    });

    const { result } = renderHook(() => useMyEventEntitlement(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe('ent-1'));
  });

  it('resolves null when the caller has no entitlement', async () => {
    const wrapper = makeWrapper();
    jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({ entitlement: null });

    const { result } = renderHook(() => useMyEventEntitlement(GROUP_ID, EVENT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('stays disabled until both groupId and eventId are known', () => {
    const wrapper = makeWrapper();
    const spy = jest.spyOn(eventEndpoints, 'getMyEventEntitlement');

    renderHook(() => useMyEventEntitlement(undefined, undefined), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });
});
