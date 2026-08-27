import { create } from 'zustand';

interface GroupState {
  /** The group the app is currently scoped to — a UI convenience pointer, never an authorization decision (see docs/state-management.md). */
  activeGroupId: string | null;
  activeOrganizationId: string | null;
  setActiveGroup: (groupId: string, organizationId: string) => void;
  clearActiveGroup: () => void;
}

/**
 * Equivalent of a "GroupContext": which group the app is scoped to right
 * now. Implemented as a Zustand store (not React Context) to stay
 * consistent with `useAuthStore` — this project's established split is
 * "TanStack Query for server data, Zustand for client-only session state"
 * (see docs/state-management.md), and the active group id is exactly that
 * kind of state. The backend remains the sole authority on what the caller
 * can actually do with this group — see src/features/groups/utils/permissions.ts.
 */
export const useGroupStore = create<GroupState>((set) => ({
  activeGroupId: null,
  activeOrganizationId: null,
  setActiveGroup: (groupId, organizationId) =>
    set({ activeGroupId: groupId, activeOrganizationId: organizationId }),
  clearActiveGroup: () => set({ activeGroupId: null, activeOrganizationId: null }),
}));
