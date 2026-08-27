import type { OrganizationRole } from '@/services/api/endpoints/organizations';

export const PERMISSIONS = [
  'group.read',
  'group.update',
  'member.read',
  'member.manage',
  'match.read',
  'match.manage',
  'finance.read',
  'finance.manage',
  'event.read',
  'event.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Mirrors gestaofut-api's `src/shared/authorization/role-permissions.ts`
 * exactly (see that repo's docs/multi-tenancy.md) — used **only** to decide
 * what the UI shows (which tabs, which buttons). This is never the source
 * of truth for authorization: every mutating request still goes through
 * the real API, which re-checks the caller's role server-side and answers
 * with 403 if this mirror ever drifts or is bypassed (e.g. a modified
 * client). Hiding a button here is a UX convenience, not a security
 * boundary — see docs/state-management.md.
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: new Set(PERMISSIONS),
  ADMIN: new Set(PERMISSIONS),
  ORGANIZER: new Set<Permission>([
    'group.read',
    'member.read',
    'member.manage',
    'match.read',
    'match.manage',
    'event.read',
    'event.manage',
  ]),
  TREASURER: new Set<Permission>([
    'group.read',
    'member.read',
    'match.read',
    'event.read',
    'finance.read',
    'finance.manage',
  ]),
  MEMBER: new Set<Permission>(['group.read', 'member.read', 'match.read', 'event.read']),
};

export function getPermissionsForRole(role: OrganizationRole): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: OrganizationRole | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}
