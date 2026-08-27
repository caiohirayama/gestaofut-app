import { useGroupStore } from '@/store/group-store';
import { hasPermission, type Permission } from '../utils/permissions';
import { useMyOrganizationRoles } from './useMyOrganizationRoles';

export interface UseActiveGroupPermissionsResult {
  role: ReturnType<typeof useMyOrganizationRoles>['rolesByOrganizationId'][string] | undefined;
  can: (permission: Permission) => boolean;
  isPending: boolean;
  isError: boolean;
}

/**
 * Permissions for the currently active group's organization — a UI hint
 * only (see src/features/groups/utils/permissions.ts). Every screen using
 * `can()` to hide a button must still rely on the API's own 403 as the
 * real authorization boundary.
 */
export function useActiveGroupPermissions(): UseActiveGroupPermissionsResult {
  const activeOrganizationId = useGroupStore((state) => state.activeOrganizationId);
  const { rolesByOrganizationId, isPending, isError } = useMyOrganizationRoles();

  const role = activeOrganizationId ? rolesByOrganizationId[activeOrganizationId] : undefined;

  return {
    role,
    can: (permission) => hasPermission(role, permission),
    isPending,
    isError,
  };
}
