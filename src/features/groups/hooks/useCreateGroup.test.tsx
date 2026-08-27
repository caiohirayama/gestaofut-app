import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useCreateGroup } from './useCreateGroup';

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function org(id: string) {
  return { id, name: `Org ${id}`, slug: id, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
}

function member(organizationId: string, role: 'OWNER' | 'MEMBER') {
  return { organizationId, userId: me.id, role, status: 'ACTIVE' as const, joinedAt: '' };
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const input = { name: 'Pelada de Sábado', sportType: 'FOOTBALL' as const, timezone: 'America/Sao_Paulo' };

describe('useCreateGroup', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  });

  it('creates the group under an existing organization the caller can manage (group.update), without creating a new organization', async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest
      .spyOn(organizationEndpoints, 'listOrganizationMembers')
      .mockResolvedValue({ members: [member('org-1', 'OWNER')] });
    const createOrganizationSpy = jest.spyOn(organizationEndpoints, 'createOrganization');
    const createGroupSpy = jest.spyOn(groupEndpoints, 'createGroup').mockResolvedValue({
      group: { id: 'group-1', organizationId: 'org-1', ...input, description: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
    });

    const { result } = renderHook(() => useCreateGroup(), { wrapper });
    await waitFor(() => expect(organizationEndpoints.listOrganizationMembers).toHaveBeenCalled());

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(createOrganizationSpy).not.toHaveBeenCalled();
    expect(createGroupSpy).toHaveBeenCalledWith('org-1', input);
  });

  it("creates a new organization first when the caller can't manage any existing one (or has none)", async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [] });
    const createOrganizationSpy = jest
      .spyOn(organizationEndpoints, 'createOrganization')
      .mockResolvedValue({ organization: org('new-org') });
    const createGroupSpy = jest.spyOn(groupEndpoints, 'createGroup').mockResolvedValue({
      group: { id: 'group-1', organizationId: 'new-org', ...input, description: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
    });

    const { result } = renderHook(() => useCreateGroup(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(createOrganizationSpy).toHaveBeenCalledWith(expect.objectContaining({ name: input.name }));
    expect(createGroupSpy).toHaveBeenCalledWith('new-org', input);
  });

  it("creates a new organization when the caller belongs to one but only as a plain MEMBER (no group.update)", async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest
      .spyOn(organizationEndpoints, 'listOrganizationMembers')
      .mockResolvedValue({ members: [member('org-1', 'MEMBER')] });
    const createOrganizationSpy = jest
      .spyOn(organizationEndpoints, 'createOrganization')
      .mockResolvedValue({ organization: org('new-org') });
    const createGroupSpy = jest.spyOn(groupEndpoints, 'createGroup').mockResolvedValue({
      group: { id: 'group-1', organizationId: 'new-org', ...input, description: null, status: 'ACTIVE', createdAt: '', updatedAt: '' },
    });

    const { result } = renderHook(() => useCreateGroup(), { wrapper });
    await waitFor(() => expect(organizationEndpoints.listOrganizationMembers).toHaveBeenCalled());

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(createOrganizationSpy).toHaveBeenCalled();
    expect(createGroupSpy).toHaveBeenCalledWith('new-org', input);
  });
});
