import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useNextMatch } from './useNextMatch';

function match(overrides: Partial<matchEndpoints.Match> = {}): matchEndpoints.Match {
  return {
    id: 'match-1',
    groupId: 'group-1',
    startsAt: '2026-03-01T18:00:00.000Z',
    endsAt: '2026-03-01T19:00:00.000Z',
    status: 'OPEN',
    locationName: null,
    locationAddress: null,
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useNextMatch', () => {
  it("resolves to the soonest upcoming match from the group's full list", async () => {
    jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({
      matches: [
        match({ id: 'later', status: 'SCHEDULED', startsAt: '2026-06-01T00:00:00.000Z' }),
        match({ id: 'sooner', status: 'OPEN', startsAt: '2026-03-01T00:00:00.000Z' }),
        match({ id: 'past', status: 'FINISHED', startsAt: '2026-01-01T00:00:00.000Z' }),
      ],
    });

    const { result } = renderHook(() => useNextMatch('group-1'), { wrapper });

    await waitFor(() => expect(result.current.data?.id).toBe('sooner'));
  });

  it('resolves to undefined when there is nothing upcoming', async () => {
    jest
      .spyOn(matchEndpoints, 'listMatches')
      .mockResolvedValue({ matches: [match({ status: 'FINISHED' })] });

    const { result } = renderHook(() => useNextMatch('group-1'), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeUndefined();
  });
});
