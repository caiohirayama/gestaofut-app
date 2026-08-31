import type { BadgeVariant } from '@/components/ui';
import type { MatchStatus, ParticipantStatus } from '@/services/api/endpoints/matches';

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Agendado',
  OPEN: 'Confirmações abertas',
  CLOSED: 'Confirmações encerradas',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export const MATCH_STATUS_BADGE_VARIANT: Record<MatchStatus, BadgeVariant> = {
  SCHEDULED: 'neutral',
  OPEN: 'success',
  CLOSED: 'warning',
  IN_PROGRESS: 'warning',
  FINISHED: 'neutral',
  CANCELLED: 'danger',
};

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Recusou',
  WAITLISTED: 'Lista de espera',
  OFFERED: 'Convite disponível',
  CANCELLED: 'Cancelou',
  ATTENDED: 'Presença registrada',
  NO_SHOW: 'Faltou',
};

export const PARTICIPANT_STATUS_BADGE_VARIANT: Record<ParticipantStatus, BadgeVariant> = {
  PENDING: 'neutral',
  CONFIRMED: 'success',
  DECLINED: 'danger',
  WAITLISTED: 'warning',
  OFFERED: 'warning',
  CANCELLED: 'danger',
  ATTENDED: 'success',
  NO_SHOW: 'danger',
};

/**
 * Statuses from which the player can confirm ("Vou jogar") or decline
 * ("Não vou") — mirrors gestaofut-api's `ALLOWED_SOURCE_STATUSES.CONFIRMED`.
 * `WAITLISTED` is deliberately excluded: since the OFERTA/fila rework, a
 * queued player can only leave the queue (decline), never confirm directly
 * — confirming from `WAITLISTED` is rejected with 409 by the API.
 */
export const PARTICIPANT_CONFIRMABLE_STATUSES: readonly ParticipantStatus[] = ['PENDING', 'OFFERED'];
