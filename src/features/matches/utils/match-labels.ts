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

/** Statuses from which the player can still act (confirm or decline) — mirrors gestaofut-api's `ALLOWED_SOURCE_STATUSES`. */
export const PARTICIPANT_ACTIONABLE_STATUSES: readonly ParticipantStatus[] = [
  'PENDING',
  'OFFERED',
  'WAITLISTED',
];
