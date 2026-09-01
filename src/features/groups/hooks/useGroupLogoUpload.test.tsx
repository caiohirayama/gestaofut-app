import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as pickImageModule from '@/features/uploads/utils/pick-image';
import * as uploadModule from '@/features/uploads/utils/upload-to-presigned-url';
import { queryKeys } from '@/services/api/query-keys';
import { useGroupLogoUpload } from './useGroupLogoUpload';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

const GROUP_ID = 'group-1';

const updatedGroup: groupEndpoints.Group = {
  id: GROUP_ID,
  organizationId: 'org-1',
  name: 'Pelada de Sábado',
  description: null,
  sportType: 'FOOTBALL',
  timezone: 'America/Sao_Paulo',
  status: 'ACTIVE',
  logoUrl: 'https://cdn.example.com/organizations/org-1/groups/group-1/logo/x.png',
  createdAt: '',
  updatedAt: '',
};

describe('useGroupLogoUpload — wires the generic flow to /groups/:groupId/logo/*', () => {
  beforeEach(() => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({
      status: 'picked',
      image: { uri: 'file:///cache/logo.png', mimeType: 'image/png', size: 2048 },
    });
    jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockResolvedValue(undefined);
  });

  it('requests a logo upload URL scoped to the given group, then confirms and caches the updated group', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const requestSpy = jest
      .spyOn(groupEndpoints, 'createGroupLogoUploadUrl')
      .mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'organizations/org-1/groups/group-1/logo/x.png', publicUrl: '', expiresAt: '' });
    const confirmSpy = jest.spyOn(groupEndpoints, 'confirmGroupLogoUpload').mockResolvedValue(updatedGroup);

    const { result } = renderHook(() => useGroupLogoUpload(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(requestSpy).toHaveBeenCalledWith(GROUP_ID, { contentType: 'image/png', contentLength: 2048 });
    expect(confirmSpy).toHaveBeenCalledWith(GROUP_ID, 'organizations/org-1/groups/group-1/logo/x.png');
    expect(result.current.stage).toBe('success');
    expect(queryClient.getQueryData(queryKeys.groups.detail(GROUP_ID))).toEqual(updatedGroup);
  });

  it('invalidates the organization\'s group list on success', async () => {
    const { wrapper, queryClient } = makeWrapper();
    jest
      .spyOn(groupEndpoints, 'createGroupLogoUploadUrl')
      .mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'k', publicUrl: '', expiresAt: '' });
    jest.spyOn(groupEndpoints, 'confirmGroupLogoUpload').mockResolvedValue(updatedGroup);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useGroupLogoUpload(GROUP_ID), { wrapper });
    await act(async () => {
      await result.current.pickAndUpload();
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.organizations.groups('org-1'));
  });
});
