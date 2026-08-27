import { QueryClient } from '@tanstack/react-query';

/**
 * Single QueryClient for the whole app. TanStack Query owns all remote
 * data/caching — Zustand must never duplicate it (see src/store).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
