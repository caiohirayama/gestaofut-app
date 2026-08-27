import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrganization } from '@/services/api/endpoints/organizations';
import { createGroup, type CreateGroupInput, type Group } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';
import { hasPermission } from '../utils/permissions';
import { slugify } from '../utils/slugify';
import { useMyOrganizationRoles } from './useMyOrganizationRoles';

/**
 * Creates a group under whichever of the caller's organizations they can
 * manage (`group.update`). If they don't have one yet — the true
 * first-group case — creates a brand-new organization first (named after
 * the group) and then the group inside it, so the person never has to
 * think about "organization" as a separate concept.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { organizations, rolesByOrganizationId } = useMyOrganizationRoles();

  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<Group> => {
      const manageableOrganization = organizations.find((organization) =>
        hasPermission(rolesByOrganizationId[organization.id], 'group.update'),
      );

      const organizationId = manageableOrganization
        ? manageableOrganization.id
        : (await createOrganization({ name: input.name, slug: slugify(input.name) })).organization.id;

      const { group } = await createGroup(organizationId, input);
      return group;
    },
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.groups(group.organizationId) });
    },
  });
}
