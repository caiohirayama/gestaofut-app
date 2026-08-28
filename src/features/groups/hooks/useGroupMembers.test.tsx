import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import {
  useAddGroupMember,
  useDeactivateGroupMember,
  useGroupMember,
  useGroupMembers,
  usePromoteGroupMember,
  useUpdateGroupMember,
} from './useGroupMembers';

const GROUP_ID = 'group-1';

function member(overrides: Partial<groupEndpoints.GroupMember> = {}): groupEndpoints.GroupMember {
  return {
    id: 'member-1',
    groupId: GROUP_ID,
    userId: 'user-1',
    membershipType: 'GUEST',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    leftAt: null,
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, queryClient };
}

describe('useGroupMembers cache behavior', () => {
  it('useAddGroupMember invalidates the members list so it refetches with the new member', async () => {
    const { wrapper } = makeWrapper();
    const listSpy = jest
      .spyOn(groupEndpoints, 'listGroupMembers')
      .mockResolvedValueOnce({ members: [] })
      .mockResolvedValueOnce({ members: [member()] });
    jest.spyOn(groupEndpoints, 'addGroupMember').mockResolvedValue({ member: member() });

    const { result: listResult } = renderHook(() => useGroupMembers(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data).toEqual([]));

    const { result: mutationResult } = renderHook(() => useAddGroupMember(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync({ userId: 'user-1', membershipType: 'GUEST' });
    });

    await waitFor(() => expect(listResult.current.data).toEqual([member()]));
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it('useUpdateGroupMember invalidates the members list, reflecting the new membershipType', async () => {
    const { wrapper } = makeWrapper();
    jest
      .spyOn(groupEndpoints, 'listGroupMembers')
      .mockResolvedValueOnce({ members: [member({ membershipType: 'GUEST' })] })
      .mockResolvedValueOnce({ members: [member({ membershipType: 'REGULAR' })] });
    jest.spyOn(groupEndpoints, 'updateGroupMember').mockResolvedValue({ member: member({ membershipType: 'REGULAR' }) });

    const { result: listResult } = renderHook(() => useGroupMembers(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.membershipType).toBe('GUEST'));

    const { result: mutationResult } = renderHook(() => useUpdateGroupMember(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync({ memberId: 'member-1', membershipType: 'REGULAR' });
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.membershipType).toBe('REGULAR'));
  });

  it('useDeactivateGroupMember invalidates the members list, reflecting INACTIVE status', async () => {
    const { wrapper } = makeWrapper();
    jest
      .spyOn(groupEndpoints, 'listGroupMembers')
      .mockResolvedValueOnce({ members: [member({ status: 'ACTIVE' })] })
      .mockResolvedValueOnce({ members: [member({ status: 'INACTIVE', leftAt: '2026-02-01T00:00:00.000Z' })] });
    jest
      .spyOn(groupEndpoints, 'deactivateGroupMember')
      .mockResolvedValue({ member: member({ status: 'INACTIVE', leftAt: '2026-02-01T00:00:00.000Z' }) });

    const { result: listResult } = renderHook(() => useGroupMembers(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('ACTIVE'));

    const { result: mutationResult } = renderHook(() => useDeactivateGroupMember(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('member-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.status).toBe('INACTIVE'));
  });

  it('usePromoteGroupMember invalidates the members list, reflecting the GUEST -> REGULAR promotion', async () => {
    const { wrapper } = makeWrapper();
    jest
      .spyOn(groupEndpoints, 'listGroupMembers')
      .mockResolvedValueOnce({ members: [member({ membershipType: 'GUEST' })] })
      .mockResolvedValueOnce({ members: [member({ membershipType: 'REGULAR' })] });
    jest.spyOn(groupEndpoints, 'promoteGroupMember').mockResolvedValue({ member: member({ membershipType: 'REGULAR' }) });

    const { result: listResult } = renderHook(() => useGroupMembers(GROUP_ID), { wrapper });
    await waitFor(() => expect(listResult.current.data?.[0]?.membershipType).toBe('GUEST'));

    const { result: mutationResult } = renderHook(() => usePromoteGroupMember(GROUP_ID), { wrapper });
    await act(async () => {
      await mutationResult.current.mutateAsync('member-1');
    });

    await waitFor(() => expect(listResult.current.data?.[0]?.membershipType).toBe('REGULAR'));
  });

  it('useGroupMember derives a single member from the same cached list (no dedicated GET-by-id endpoint exists)', async () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [member({ id: 'member-1' }), member({ id: 'member-2' })] });

    const { result } = renderHook(() => useGroupMember(GROUP_ID, 'member-2'), { wrapper });

    await waitFor(() => expect(result.current.data?.id).toBe('member-2'));
  });
});
