import { useQuery } from '@tanstack/react-query';
import { listOrganizations } from '@/services/api/endpoints/organizations';
import { queryKeys } from '@/services/api/query-keys';
import { useAuthStore } from '@/store/auth-store';

/** Organizations the authenticated caller has an active membership in. */
export function useOrganizations() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.organizations.list,
    queryFn: async ({ signal }) => (await listOrganizations(signal)).organizations,
    enabled: status === 'authenticated',
  });
}
