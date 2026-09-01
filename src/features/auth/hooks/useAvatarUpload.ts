import { useQueryClient } from '@tanstack/react-query';
import { useImageUpload, type UseImageUploadResult } from '@/features/uploads/hooks/useImageUpload';
import { confirmAvatarUpload, createAvatarUploadUrl, type AuthUser } from '@/services/api/endpoints/auth';
import { queryKeys } from '@/services/api/query-keys';

/** "avatar" — the first of the two upload uses from docs/uploads.md; wires the generic flow to `/me/avatar/*`. */
export function useAvatarUpload(): UseImageUploadResult<AuthUser> {
  const queryClient = useQueryClient();

  return useImageUpload<AuthUser>({
    requestUploadUrl: (params) => createAvatarUploadUrl(params),
    confirmUpload: async ({ key }) => {
      const user = await confirmAvatarUpload(key);
      queryClient.setQueryData(queryKeys.auth.me, user);
      return user;
    },
  });
}
