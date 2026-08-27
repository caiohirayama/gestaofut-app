import { useQueries } from '@tanstack/react-query';
import { listOrganizationGroups, type Group } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';
import { useOrganizations } from './useOrganizations';

export interface UseMyGroupsResult {
  groups: Group[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Every group the caller can see, across every organization they belong to. */
export function useMyGroups(): UseMyGroupsResult {
  const organizationsQuery = useOrganizations();
  const organizations = organizationsQuery.data ?? [];

  const groupQueries = useQueries({
    queries: organizations.map((organization) => ({
      queryKey: queryKeys.organizations.groups(organization.id),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listOrganizationGroups(organization.id, signal)).groups,
      staleTime: 30_000,
    })),
  });

  const isPending = organizationsQuery.isPending || groupQueries.some((query) => query.isPending);
  const isError = organizationsQuery.isError || groupQueries.some((query) => query.isError);
  const groups = groupQueries.flatMap((query) => query.data ?? []);

  function refetch() {
    void organizationsQuery.refetch();
    groupQueries.forEach((query) => void query.refetch());
  }

  return { groups, isPending, isError, refetch };
}
