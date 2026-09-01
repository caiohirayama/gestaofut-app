import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as pickImageModule from '@/features/uploads/utils/pick-image';
import * as uploadModule from '@/features/uploads/utils/upload-to-presigned-url';
import { queryKeys } from '@/services/api/query-keys';
import { useAvatarUpload } from './useAvatarUpload';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

const updatedUser: authEndpoints.AuthUser = {
  id: 'user-1',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null,
  status: 'ACTIVE',
  avatarUrl: 'https://cdn.example.com/users/user-1/avatar/x.jpg',
  createdAt: '',
  updatedAt: '',
};

describe('useAvatarUpload — wires the generic flow to /me/avatar/*', () => {
  beforeEach(() => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({
      status: 'picked',
      image: { uri: 'file:///cache/photo.jpg', mimeType: 'image/jpeg', size: 1024 },
    });
    jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockResolvedValue(undefined);
  });

  it('requests an avatar upload URL, then confirms it and caches the updated user under queryKeys.auth.me', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const requestSpy = jest
      .spyOn(authEndpoints, 'createAvatarUploadUrl')
      .mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'users/user-1/avatar/x.jpg', publicUrl: '', expiresAt: '' });
    const confirmSpy = jest.spyOn(authEndpoints, 'confirmAvatarUpload').mockResolvedValue(updatedUser);

    const { result } = renderHook(() => useAvatarUpload(), { wrapper });
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(requestSpy).toHaveBeenCalledWith({ contentType: 'image/jpeg', contentLength: 1024 });
    expect(confirmSpy).toHaveBeenCalledWith('users/user-1/avatar/x.jpg');
    expect(result.current.stage).toBe('success');
    expect(queryClient.getQueryData(queryKeys.auth.me)).toEqual(updatedUser);
  });
});
