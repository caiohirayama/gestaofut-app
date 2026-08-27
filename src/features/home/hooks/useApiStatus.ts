import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/services/api/endpoints/system';
import { queryKeys } from '@/services/api/query-keys';

export function useApiStatus() {
  return useQuery({
    queryKey: queryKeys.system.health,
    queryFn: ({ signal }) => getHealth(signal),
    staleTime: 15_000,
  });
}
