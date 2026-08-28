import type { GroupMember } from '@/services/api/endpoints/groups';
import { filterMembers } from './filter-members';

function member(overrides: Partial<GroupMember>): GroupMember {
  return {
    id: 'member-id',
    groupId: 'group-1',
    userId: 'user-id',
    membershipType: 'REGULAR',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    leftAt: null,
    ...overrides,
  };
}

const regularActive = member({ id: '1', userId: 'aaaaaaaa-1111', membershipType: 'REGULAR', status: 'ACTIVE' });
const goalkeeperActive = member({ id: '2', userId: 'bbbbbbbb-2222', membershipType: 'GOALKEEPER', status: 'ACTIVE' });
const guestActive = member({ id: '3', userId: 'cccccccc-3333', membershipType: 'GUEST', status: 'ACTIVE' });
const regularInactive = member({ id: '4', userId: 'dddddddd-4444', membershipType: 'REGULAR', status: 'INACTIVE' });
const goalkeeperSuspended = member({ id: '5', userId: 'eeeeeeee-5555', membershipType: 'GOALKEEPER', status: 'SUSPENDED' });

const allMembers = [regularActive, goalkeeperActive, guestActive, regularInactive, goalkeeperSuspended];

describe('filterMembers', () => {
  it('"Todos" shows every ACTIVE member, regardless of type', () => {
    expect(filterMembers(allMembers, 'ALL', '')).toEqual([regularActive, goalkeeperActive, guestActive]);
  });

  it('"Mensalistas" shows only ACTIVE REGULAR members', () => {
    expect(filterMembers(allMembers, 'REGULAR', '')).toEqual([regularActive]);
  });

  it('"Goleiros" shows only ACTIVE GOALKEEPER members', () => {
    expect(filterMembers(allMembers, 'GOALKEEPER', '')).toEqual([goalkeeperActive]);
  });

  it('"Avulsos" shows only ACTIVE GUEST members', () => {
    expect(filterMembers(allMembers, 'GUEST', '')).toEqual([guestActive]);
  });

  it('"Inativos" shows both INACTIVE and SUSPENDED members (anything not ACTIVE)', () => {
    expect(filterMembers(allMembers, 'INACTIVE', '')).toEqual([regularInactive, goalkeeperSuspended]);
  });

  it('every member falls into exactly "Todos" (if active) or "Inativos" (otherwise) — no one is lost', () => {
    const active = filterMembers(allMembers, 'ALL', '');
    const inactive = filterMembers(allMembers, 'INACTIVE', '');
    expect(active.length + inactive.length).toBe(allMembers.length);
  });

  it('search narrows by userId substring, case-insensitively, on top of the active filter', () => {
    expect(filterMembers(allMembers, 'ALL', 'BBBBBBBB')).toEqual([goalkeeperActive]);
  });

  it('search combines with a type filter (both must match)', () => {
    expect(filterMembers(allMembers, 'REGULAR', 'dddddddd')).toEqual([]); // regularInactive matches search but not REGULAR+ACTIVE
    expect(filterMembers(allMembers, 'INACTIVE', 'dddddddd')).toEqual([regularInactive]);
  });

  it('an empty/whitespace-only search does not filter anything out', () => {
    expect(filterMembers(allMembers, 'ALL', '   ')).toEqual([regularActive, goalkeeperActive, guestActive]);
  });
});
