import { apiFetch } from '../client';

export const MATCH_STATUSES = [
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'IN_PROGRESS',
  'FINISHED',
  'CANCELLED',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const PARTICIPANT_TYPES = ['REGULAR', 'GOALKEEPER', 'GUEST'] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

export const PARTICIPANT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'WAITLISTED',
  'OFFERED',
  'CANCELLED',
  'ATTENDED',
  'NO_SHOW',
] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

/** Mirrors the shape gestaofut-api returns (see its docs/matches.md). `regularCapacity`/`goalkeeperCapacity` are a snapshot taken at creation time, `null` meaning unlimited. */
export interface Match {
  id: string;
  groupId: string;
  startsAt: string;
  endsAt: string;
  status: MatchStatus;
  locationName: string | null;
  locationAddress: string | null;
  regularCapacity: number | null;
  goalkeeperCapacity: number | null;
  createdAt: string;
  updatedAt: string;
}

/** `typeAtMatch` is a snapshot of the member's category at enrollment time — see gestaofut-api docs/matches.md. */
export interface MatchParticipant {
  id: string;
  matchId: string;
  groupMemberId: string;
  typeAtMatch: ParticipantType;
  status: ParticipantStatus;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listMatches(
  groupId: string,
  filters?: { status?: MatchStatus },
  signal?: AbortSignal,
): Promise<{ matches: Match[] }> {
  const query = filters?.status ? `?status=${filters.status}` : '';
  return apiFetch<{ matches: Match[] }>(`/groups/${groupId}/matches${query}`, { signal });
}

export function getMatch(groupId: string, matchId: string, signal?: AbortSignal): Promise<Match> {
  return apiFetch<Match>(`/groups/${groupId}/matches/${matchId}`, { signal });
}

export function listMatchParticipants(
  groupId: string,
  matchId: string,
  signal?: AbortSignal,
): Promise<{ participants: MatchParticipant[] }> {
  return apiFetch<{ participants: MatchParticipant[] }>(
    `/groups/${groupId}/matches/${matchId}/participants`,
    {
      signal,
    },
  );
}

/** "Vou jogar" from PENDING/OFFERED/WAITLISTED. Can fail with 409 if the match's capacity fills concurrently — see gestaofut-api docs/matches.md. */
export function confirmMatchParticipant(
  groupId: string,
  matchId: string,
  participantId: string,
): Promise<MatchParticipant> {
  return apiFetch<MatchParticipant>(
    `/groups/${groupId}/matches/${matchId}/participants/${participantId}/confirm`,
    { method: 'POST' },
  );
}

/** "Não vou" from PENDING/OFFERED/WAITLISTED — only frees this match's slot, never touches membership. */
export function declineMatchParticipant(
  groupId: string,
  matchId: string,
  participantId: string,
): Promise<MatchParticipant> {
  return apiFetch<MatchParticipant>(
    `/groups/${groupId}/matches/${matchId}/participants/${participantId}/decline`,
    { method: 'POST' },
  );
}

/** Backing out after already CONFIRMED — the only valid path out of CONFIRMED (decline is rejected from that state by the API). */
export function cancelMatchParticipant(
  groupId: string,
  matchId: string,
  participantId: string,
): Promise<MatchParticipant> {
  return apiFetch<MatchParticipant>(
    `/groups/${groupId}/matches/${matchId}/participants/${participantId}/cancel`,
    { method: 'POST' },
  );
}
