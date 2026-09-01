import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useMatchRosterPreview } from './useMatchRoster';

const GROUP_ID = 'group-1';
const MATCH_ID = 'match-1';

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMatchRosterPreview', () => {
  it('fetches the shareable roster text for the match', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: 'JOGO PELADA 12/08 19:15' });

    const { result } = renderHook(() => useMatchRosterPreview(GROUP_ID, MATCH_ID), { wrapper });

    await waitFor(() => expect(result.current.data).toBe('JOGO PELADA 12/08 19:15'));
  });

  it('stays disabled until both groupId and matchId are known', () => {
    const spy = jest.spyOn(matchEndpoints, 'getMatchRosterPreview');

    renderHook(() => useMatchRosterPreview(undefined, undefined), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces an error (e.g. 403 for a caller without match.manage) via isError', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockRejectedValue(new ApiError('forbidden', 'FORBIDDEN', 403));

    const { result } = renderHook(() => useMatchRosterPreview(GROUP_ID, MATCH_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
