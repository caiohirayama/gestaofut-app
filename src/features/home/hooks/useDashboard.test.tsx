import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as dashboardEndpoints from '@/services/api/endpoints/dashboard';
import { useDashboard } from './useDashboard';

const GROUP_ID = 'group-1';

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDashboard', () => {
  it('fetches the aggregated dashboard for the group', async () => {
    const dashboard: dashboardEndpoints.Dashboard = { alerts: { pendingConfirmations: 0 } };
    jest.spyOn(dashboardEndpoints, 'getDashboard').mockResolvedValue(dashboard);

    const { result } = renderHook(() => useDashboard(GROUP_ID), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(dashboard));
  });

  it('stays disabled until a groupId is known', () => {
    const spy = jest.spyOn(dashboardEndpoints, 'getDashboard');

    renderHook(() => useDashboard(undefined), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });
});
