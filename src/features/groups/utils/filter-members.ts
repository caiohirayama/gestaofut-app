import type { GroupMember } from '@/services/api/endpoints/groups';

export const MEMBER_FILTERS = ['ALL', 'REGULAR', 'GOALKEEPER', 'GUEST', 'INACTIVE'] as const;
export type MemberFilterKey = (typeof MEMBER_FILTERS)[number];

export const MEMBER_FILTER_LABELS: Record<MemberFilterKey, string> = {
  ALL: 'Todos',
  REGULAR: 'Mensalistas',
  GOALKEEPER: 'Goleiros',
  GUEST: 'Avulsos',
  INACTIVE: 'Inativos',
};

/**
 * "Todos"/"Mensalistas"/"Goleiros"/"Avulsos" all mean *active* members of
 * that type; "Inativos" is everyone else (`INACTIVE` or `SUSPENDED`) — a
 * clean partition where every member falls into exactly one bucket outside
 * the type sub-filters. Done client-side (not via the API's `?status=`
 * query param) because a group's roster is small (20-100 members per the
 * product brief), and the API only supports one exact status value per
 * request — it can't express "INACTIVE or SUSPENDED" in one call anyway.
 */
export function filterMembers(members: GroupMember[], filter: MemberFilterKey, search: string): GroupMember[] {
  const query = search.trim().toLowerCase();
  const bySearch = query ? members.filter((member) => member.userId.toLowerCase().includes(query)) : members;

  switch (filter) {
    case 'ALL':
      return bySearch.filter((member) => member.status === 'ACTIVE');
    case 'REGULAR':
      return bySearch.filter((member) => member.status === 'ACTIVE' && member.membershipType === 'REGULAR');
    case 'GOALKEEPER':
      return bySearch.filter((member) => member.status === 'ACTIVE' && member.membershipType === 'GOALKEEPER');
    case 'GUEST':
      return bySearch.filter((member) => member.status === 'ACTIVE' && member.membershipType === 'GUEST');
    case 'INACTIVE':
      return bySearch.filter((member) => member.status !== 'ACTIVE');
    default:
      return bySearch;
  }
}
