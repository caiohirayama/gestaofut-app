import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/services/api/endpoints/dashboard';
import { queryKeys } from '@/services/api/query-keys';

/** The Home screen's single aggregated read — see gestaofut-api docs/dashboard.md. */
export function useDashboard(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.detail(groupId ?? ''),
    queryFn: ({ signal }) => getDashboard(groupId!, signal),
    enabled: Boolean(groupId),
  });
}
