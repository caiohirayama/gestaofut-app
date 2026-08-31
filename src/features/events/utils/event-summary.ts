import type { EventParticipant } from '@/services/api/endpoints/events';

/** "18 confirmados" — counts CONFIRMED and (once the event has happened) ATTENDED, so the number doesn't drop back down after admins mark attendance. */
export function countConfirmedParticipants(participants: EventParticipant[]): number {
  return participants.filter((p) => p.status === 'CONFIRMED' || p.status === 'ATTENDED').length;
}
