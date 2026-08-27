import { useQuery } from '@tanstack/react-query';
import { listOrganizationGroups } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

export function useOrganizationGroups(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.groups(organizationId ?? ''),
    queryFn: async ({ signal }) => (await listOrganizationGroups(organizationId!, signal)).groups,
    enabled: Boolean(organizationId),
  });
}
