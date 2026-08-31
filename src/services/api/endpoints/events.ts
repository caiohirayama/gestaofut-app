import { apiFetch } from '../client';

export const EVENT_TYPES = ['BARBECUE', 'SOCIAL', 'TOURNAMENT', 'OTHER'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'FINISHED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_PARTICIPANT_STATUSES = [
  'INVITED',
  'CONFIRMED',
  'DECLINED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELLED',
] as const;
export type EventParticipantStatus = (typeof EVENT_PARTICIPANT_STATUSES)[number];

export const EVENT_ENTITLEMENT_SOURCES = ['MONTHLY_FEE_PAID', 'MANUAL'] as const;
export type EventEntitlementSource = (typeof EVENT_ENTITLEMENT_SOURCES)[number];

/** Mirrors the shape gestaofut-api returns (see its docs/events.md) — generic, never barbecue-specific. */
export interface Event {
  id: string;
  groupId: string;
  type: EventType;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  locationName: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  groupMemberId: string;
  status: EventParticipantStatus;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** "BENEFÍCIO": an explicit, non-accumulating record — see gestaofut-api docs/events.md. */
export interface EventEntitlement {
  id: string;
  eventId: string;
  groupMemberId: string;
  source: EventEntitlementSource;
  grantedAt: string;
  revokedAt: string | null;
}

export interface EventFilters {
  type?: EventType;
  status?: EventStatus;
}

function toQueryString(filters: object): string {
  const params = Object.entries(filters).filter((entry): entry is [string, string] => entry[1] !== undefined);
  if (params.length === 0) return '';
  return `?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

export function listEvents(groupId: string, filters?: EventFilters, signal?: AbortSignal): Promise<{ events: Event[] }> {
  return apiFetch<{ events: Event[] }>(`/groups/${groupId}/events${toQueryString(filters ?? {})}`, { signal });
}

export function getEvent(groupId: string, eventId: string, signal?: AbortSignal): Promise<Event> {
  return apiFetch<Event>(`/groups/${groupId}/events/${eventId}`, { signal });
}

export interface CreateEventInput {
  type: EventType;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  locationName?: string | null;
}

/** Always starts DRAFT — see gestaofut-api docs/events.md. */
export function createEvent(groupId: string, input: CreateEventInput): Promise<Event> {
  return apiFetch<Event>(`/groups/${groupId}/events`, { method: 'POST', body: input });
}

export interface UpdateEventInput {
  type?: EventType;
  title?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string;
  locationName?: string | null;
  status?: Exclude<EventStatus, 'DRAFT'>;
}

/** Field edits and/or a status move (DRAFT -> OPEN -> CLOSED -> FINISHED, CANCELLED from any non-terminal status) — see gestaofut-api docs/events.md. */
export function updateEvent(groupId: string, eventId: string, input: UpdateEventInput): Promise<Event> {
  return apiFetch<Event>(`/groups/${groupId}/events/${eventId}`, { method: 'PATCH', body: input });
}

export function listEventParticipants(
  groupId: string,
  eventId: string,
  signal?: AbortSignal,
): Promise<{ participants: EventParticipant[] }> {
  return apiFetch<{ participants: EventParticipant[] }>(`/groups/${groupId}/events/${eventId}/participants`, { signal });
}

/** ADMIN-only: an event has no self-service join, only explicit invitation — see gestaofut-api docs/events.md. */
export function inviteEventParticipant(groupId: string, eventId: string, groupMemberId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants`, {
    method: 'POST',
    body: { groupMemberId },
  });
}

export function confirmEventParticipant(groupId: string, eventId: string, participantId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants/${participantId}/confirm`, {
    method: 'POST',
  });
}

export function declineEventParticipant(groupId: string, eventId: string, participantId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants/${participantId}/decline`, {
    method: 'POST',
  });
}

export function cancelEventParticipant(groupId: string, eventId: string, participantId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants/${participantId}/cancel`, {
    method: 'POST',
  });
}

/** ADMIN-only post-event record — never self-declared, see gestaofut-api docs/events.md. */
export function markEventParticipantAttended(groupId: string, eventId: string, participantId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants/${participantId}/attend`, {
    method: 'POST',
  });
}

export function markEventParticipantNoShow(groupId: string, eventId: string, participantId: string): Promise<EventParticipant> {
  return apiFetch<EventParticipant>(`/groups/${groupId}/events/${eventId}/participants/${participantId}/no-show`, {
    method: 'POST',
  });
}

/** "Incluso na mensalidade": self-service, `null` when the caller has no (non-revoked) entitlement — see gestaofut-api docs/events.md. */
export function getMyEventEntitlement(
  groupId: string,
  eventId: string,
  signal?: AbortSignal,
): Promise<{ entitlement: EventEntitlement | null }> {
  return apiFetch<{ entitlement: EventEntitlement | null }>(`/groups/${groupId}/events/${eventId}/entitlements/me`, { signal });
}
