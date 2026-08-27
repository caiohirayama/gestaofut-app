import { useQueries } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { listOrganizationMembers, type Organization, type OrganizationRole } from '@/services/api/endpoints/organizations';
import { queryKeys } from '@/services/api/query-keys';
import { useOrganizations } from './useOrganizations';

export interface UseMyOrganizationRolesResult {
  organizations: Organization[];
  /** The caller's own active role in each organization, keyed by organizationId. */
  rolesByOrganizationId: Record<string, OrganizationRole>;
  isPending: boolean;
  isError: boolean;
}

/**
 * The API has no "my role" field on `GET /organizations` — only
 * `GET /organizations/:id/members` (the full roster) carries `role`. This
 * derives "my role" by fetching each organization's member list and
 * matching the caller's own userId — every active role includes
 * `member.read`, so this always succeeds for a real member. See
 * gestaofut-api docs/multi-tenancy.md.
 */
export function useMyOrganizationRoles(): UseMyOrganizationRolesResult {
  const { data: me } = useCurrentUser();
  const organizationsQuery = useOrganizations();
  const organizations = organizationsQuery.data ?? [];

  const memberQueries = useQueries({
    queries: organizations.map((organization) => ({
      queryKey: queryKeys.organizations.members(organization.id),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listOrganizationMembers(organization.id, signal)).members,
      enabled: Boolean(me),
      staleTime: 60_000,
    })),
  });

  const isPending = organizationsQuery.isPending || (Boolean(me) && memberQueries.some((query) => query.isPending));
  const isError = organizationsQuery.isError || memberQueries.some((query) => query.isError);

  const rolesByOrganizationId: Record<string, OrganizationRole> = {};
  organizations.forEach((organization, index) => {
    const members = memberQueries[index]?.data;
    const mine = members?.find((member) => member.userId === me?.id);
    if (mine) {
      rolesByOrganizationId[organization.id] = mine.role;
    }
  });

  return { organizations, rolesByOrganizationId, isPending, isError };
}
