import { getPermissionsForRole, hasPermission, PERMISSIONS } from './permissions';

describe('permissions mirror (OrganizationRole -> Permission)', () => {
  it('grants OWNER and ADMIN every permission', () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission('OWNER', permission)).toBe(true);
      expect(hasPermission('ADMIN', permission)).toBe(true);
    }
  });

  it('MEMBER can only read, never manage', () => {
    expect(hasPermission('MEMBER', 'group.read')).toBe(true);
    expect(hasPermission('MEMBER', 'member.read')).toBe(true);
    expect(hasPermission('MEMBER', 'match.read')).toBe(true);
    expect(hasPermission('MEMBER', 'event.read')).toBe(true);

    expect(hasPermission('MEMBER', 'group.update')).toBe(false);
    expect(hasPermission('MEMBER', 'member.manage')).toBe(false);
    expect(hasPermission('MEMBER', 'finance.read')).toBe(false);
  });

  it('ORGANIZER can manage members/matches/events but not finance or group settings', () => {
    expect(hasPermission('ORGANIZER', 'member.manage')).toBe(true);
    expect(hasPermission('ORGANIZER', 'match.manage')).toBe(true);
    expect(hasPermission('ORGANIZER', 'event.manage')).toBe(true);
    expect(hasPermission('ORGANIZER', 'group.update')).toBe(false);
    expect(hasPermission('ORGANIZER', 'finance.read')).toBe(false);
  });

  it('TREASURER can manage finance but not members or the group', () => {
    expect(hasPermission('TREASURER', 'finance.read')).toBe(true);
    expect(hasPermission('TREASURER', 'finance.manage')).toBe(true);
    expect(hasPermission('TREASURER', 'member.manage')).toBe(false);
    expect(hasPermission('TREASURER', 'group.update')).toBe(false);
  });

  it('returns false for every permission when there is no role (e.g. no active group yet)', () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission(undefined, permission)).toBe(false);
    }
  });

  it('getPermissionsForRole returns a set consistent with hasPermission', () => {
    const organizerPermissions = getPermissionsForRole('ORGANIZER');
    for (const permission of PERMISSIONS) {
      expect(organizerPermissions.has(permission)).toBe(hasPermission('ORGANIZER', permission));
    }
  });
});
