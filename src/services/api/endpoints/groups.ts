import { apiFetch } from '../client';

export const SPORT_TYPES = [
  'FOOTBALL',
  'FUTSAL',
  'VOLLEYBALL',
  'BEACH_TENNIS',
  'BASKETBALL',
  'PADEL',
  'OTHER',
] as const;
export type SportType = (typeof SPORT_TYPES)[number];

export type GroupStatus = 'ACTIVE' | 'INACTIVE';

export const MEMBERSHIP_TYPES = ['REGULAR', 'GOALKEEPER', 'GUEST'] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];
export type GroupMemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

/** Mirrors the shape gestaofut-api returns (see its docs/multi-tenancy.md). */
export interface Group {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  sportType: SportType;
  timezone: string;
  status: GroupStatus;
  createdAt: string;
  updatedAt: string;
}

/** `monthlyFee`/`guestFee` stay as strings (raw NUMERIC) — never parse to number, see gestaofut-api docs/database.md. */
export interface GroupSettings {
  groupId: string;
  defaultMatchWeekday: number | null;
  defaultMatchTime: string | null;
  defaultMatchDurationMinutes: number | null;
  maxRegularPlayers: number | null;
  maxGoalkeepers: number | null;
  monthlyFee: string | null;
  guestFee: string | null;
  confirmationDeadlineHours: number | null;
  waitlistOfferTimeoutMinutes: number | null;
  monthlyBarbecueEnabled: boolean;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  membershipType: MembershipType;
  status: GroupMemberStatus;
  joinedAt: string;
  leftAt: string | null;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  sportType: SportType;
  timezone: string;
}

export function createGroup(organizationId: string, input: CreateGroupInput): Promise<{ group: Group }> {
  return apiFetch<{ group: Group }>(`/organizations/${organizationId}/groups`, { method: 'POST', body: input });
}

export function listOrganizationGroups(organizationId: string, signal?: AbortSignal): Promise<{ groups: Group[] }> {
  return apiFetch<{ groups: Group[] }>(`/organizations/${organizationId}/groups`, { signal });
}

export function getGroup(groupId: string, signal?: AbortSignal): Promise<Group> {
  return apiFetch<Group>(`/groups/${groupId}`, { signal });
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  sportType?: SportType;
  timezone?: string;
  status?: GroupStatus;
}

export function updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
  return apiFetch<Group>(`/groups/${groupId}`, { method: 'PATCH', body: input });
}

export function getGroupSettings(groupId: string, signal?: AbortSignal): Promise<GroupSettings> {
  return apiFetch<GroupSettings>(`/groups/${groupId}/settings`, { signal });
}

export interface UpdateGroupSettingsInput {
  defaultMatchWeekday?: number | null;
  defaultMatchTime?: string | null;
  defaultMatchDurationMinutes?: number | null;
  maxRegularPlayers?: number | null;
  maxGoalkeepers?: number | null;
  monthlyFee?: string | null;
  guestFee?: string | null;
  confirmationDeadlineHours?: number | null;
  waitlistOfferTimeoutMinutes?: number | null;
  monthlyBarbecueEnabled?: boolean;
  currency?: string;
  timezone?: string;
}

export function updateGroupSettings(groupId: string, input: UpdateGroupSettingsInput): Promise<GroupSettings> {
  return apiFetch<GroupSettings>(`/groups/${groupId}/settings`, { method: 'PATCH', body: input });
}

export function listGroupMembers(groupId: string, signal?: AbortSignal): Promise<{ members: GroupMember[] }> {
  return apiFetch<{ members: GroupMember[] }>(`/groups/${groupId}/members`, { signal });
}

export function addGroupMember(
  groupId: string,
  input: { userId: string; membershipType: MembershipType },
): Promise<{ member: GroupMember }> {
  return apiFetch<{ member: GroupMember }>(`/groups/${groupId}/members`, { method: 'POST', body: input });
}

export function updateGroupMember(
  groupId: string,
  memberId: string,
  input: { membershipType?: MembershipType; status?: GroupMemberStatus },
): Promise<{ member: GroupMember }> {
  return apiFetch<{ member: GroupMember }>(`/groups/${groupId}/members/${memberId}`, {
    method: 'PATCH',
    body: input,
  });
}

/** The only way membership is permanently removed — sets status to INACTIVE. */
export function deactivateGroupMember(groupId: string, memberId: string): Promise<{ member: GroupMember }> {
  return apiFetch<{ member: GroupMember }>(`/groups/${groupId}/members/${memberId}/deactivate`, {
    method: 'POST',
  });
}

/** GUEST -> REGULAR, respecting max_regular_players. Rejects (409) if the member isn't currently a GUEST. */
export function promoteGroupMember(groupId: string, memberId: string): Promise<{ member: GroupMember }> {
  return apiFetch<{ member: GroupMember }>(`/groups/${groupId}/members/${memberId}/promote`, {
    method: 'POST',
  });
}

export interface GroupMemberHistoryEntry {
  id: string;
  groupMemberId: string;
  fromMembershipType: MembershipType | null;
  toMembershipType: MembershipType;
  fromStatus: GroupMemberStatus | null;
  toStatus: GroupMemberStatus;
  actorUserId: string | null;
  createdAt: string;
}

export function getGroupMemberHistory(
  groupId: string,
  memberId: string,
  signal?: AbortSignal,
): Promise<{ history: GroupMemberHistoryEntry[] }> {
  return apiFetch<{ history: GroupMemberHistoryEntry[] }>(`/groups/${groupId}/members/${memberId}/history`, {
    signal,
  });
}
