import type { EventStatus } from '@/services/api/endpoints/events';

/**
 * Mirrors gestaofut-api's `update-event.use-case.ts` `ALLOWED_SOURCE_STATUSES`
 * exactly (`DRAFT -> OPEN -> CLOSED -> FINISHED`, `CANCELLED` from any
 * non-terminal status) — a UI hint only, the server re-validates every
 * transition regardless.
 */
export const NEXT_EVENT_STATUS: Partial<Record<EventStatus, { status: Exclude<EventStatus, 'DRAFT'>; label: string }>> = {
  DRAFT: { status: 'OPEN', label: 'Abrir confirmações' },
  OPEN: { status: 'CLOSED', label: 'Encerrar confirmações' },
  CLOSED: { status: 'FINISHED', label: 'Finalizar evento' },
};

export const CANCELLABLE_EVENT_STATUSES: readonly EventStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];
