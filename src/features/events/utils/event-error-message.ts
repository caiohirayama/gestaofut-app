import { getApiErrorMessage } from '@/services/api/error-message';

export function getEventParticipantErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    CONFLICT: 'Essa ação não é mais possível para esse convite.',
  });
}
