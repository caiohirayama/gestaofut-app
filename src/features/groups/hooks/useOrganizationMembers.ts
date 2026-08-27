import { useQuery } from '@tanstack/react-query';
import { listOrganizationMembers } from '@/services/api/endpoints/organizations';
import { queryKeys } from '@/services/api/query-keys';

export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.members(organizationId ?? ''),
    queryFn: async ({ signal }) => (await listOrganizationMembers(organizationId!, signal)).members,
    enabled: Boolean(organizationId),
  });
}
