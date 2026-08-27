import { apiFetch } from '../client';

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE';
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'ORGANIZER' | 'TREASURER' | 'MEMBER';
export type OrganizationMemberStatus = 'ACTIVE' | 'INACTIVE';

/** Mirrors the shape gestaofut-api returns (see its docs/multi-tenancy.md). */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  joinedAt: string;
}

export function createOrganization(input: { name: string; slug: string }): Promise<{ organization: Organization }> {
  return apiFetch<{ organization: Organization }>('/organizations', { method: 'POST', body: input });
}

export function listOrganizations(signal?: AbortSignal): Promise<{ organizations: Organization[] }> {
  return apiFetch<{ organizations: Organization[] }>('/organizations', { signal });
}

export function listOrganizationMembers(
  organizationId: string,
  signal?: AbortSignal,
): Promise<{ members: OrganizationMember[] }> {
  return apiFetch<{ members: OrganizationMember[] }>(`/organizations/${organizationId}/members`, { signal });
}

export function addOrganizationMember(
  organizationId: string,
  input: { userId: string; role: OrganizationRole },
): Promise<{ member: OrganizationMember }> {
  return apiFetch<{ member: OrganizationMember }>(`/organizations/${organizationId}/members`, {
    method: 'POST',
    body: input,
  });
}

export function updateOrganizationMember(
  organizationId: string,
  userId: string,
  input: { role?: OrganizationRole; status?: OrganizationMemberStatus },
): Promise<{ member: OrganizationMember }> {
  return apiFetch<{ member: OrganizationMember }>(`/organizations/${organizationId}/members/${userId}`, {
    method: 'PATCH',
    body: input,
  });
}
