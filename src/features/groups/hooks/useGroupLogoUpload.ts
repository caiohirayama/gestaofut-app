import { useQueryClient } from '@tanstack/react-query';
import { useImageUpload, type UseImageUploadResult } from '@/features/uploads/hooks/useImageUpload';
import { confirmGroupLogoUpload, createGroupLogoUploadUrl, type Group } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

/** "logo do grupo quando autorizado" — the route itself enforces `group.update` (see docs/uploads.md); the caller (`GroupLogoPicker`) also gates rendering by the same permission as UX, never as the real boundary. */
export function useGroupLogoUpload(groupId: string): UseImageUploadResult<Group> {
  const queryClient = useQueryClient();

  return useImageUpload<Group>({
    requestUploadUrl: (params) => createGroupLogoUploadUrl(groupId, params),
    confirmUpload: async ({ key }) => {
      const group = await confirmGroupLogoUpload(groupId, key);
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.groups(group.organizationId) });
      return group;
    },
  });
}
