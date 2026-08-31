import type { BadgeVariant } from '@/components/ui';
import { EVENT_TYPES, type EventParticipantStatus, type EventStatus, type EventType } from '@/services/api/endpoints/events';
import type { ChipOption } from '@/features/groups/components/ChipSelect';

/**
 * "Churrasco pode usar identidade visual levemente diferente, mas manter
 * design system": each `EventType` gets its own emoji/label, but every
 * event renders through the exact same components, colors and spacing —
 * see gestaofut-app docs/events.md.
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BARBECUE: 'Churrasco',
  SOCIAL: 'Social',
  TOURNAMENT: 'Torneio',
  OTHER: 'Evento',
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  BARBECUE: '🔥',
  SOCIAL: '🎉',
  TOURNAMENT: '🏆',
  OTHER: '📅',
};

export const EVENT_TYPE_OPTIONS: ChipOption<EventType>[] = EVENT_TYPES.map((value) => ({
  value,
  label: EVENT_TYPE_LABELS[value],
}));

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Confirmações abertas',
  CLOSED: 'Confirmações encerradas',
  FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export const EVENT_STATUS_BADGE_VARIANT: Record<EventStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  OPEN: 'success',
  CLOSED: 'warning',
  FINISHED: 'neutral',
  CANCELLED: 'danger',
};

export const EVENT_PARTICIPANT_STATUS_LABELS: Record<EventParticipantStatus, string> = {
  INVITED: 'Convidado',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Recusou',
  ATTENDED: 'Presença registrada',
  NO_SHOW: 'Faltou',
  CANCELLED: 'Cancelou',
};

export const EVENT_PARTICIPANT_STATUS_BADGE_VARIANT: Record<EventParticipantStatus, BadgeVariant> = {
  INVITED: 'neutral',
  CONFIRMED: 'success',
  DECLINED: 'danger',
  ATTENDED: 'success',
  NO_SHOW: 'danger',
  CANCELLED: 'neutral',
};

/** Events still "upcoming" for the Home highlight/list ordering — mirrors `matches`' own upcoming/history split. */
export const UPCOMING_EVENT_STATUSES: readonly EventStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];
