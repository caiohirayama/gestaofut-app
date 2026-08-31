import { getApiErrorMessage } from '@/services/api/error-message';

/** `CONFLICT` on a confirm action means the match's capacity filled before this request landed — see gestaofut-api docs/matches.md on last-slot concurrency. */
export function getMatchParticipantErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    CONFLICT: 'Não há mais vagas disponíveis para esse jogo.',
  });
}
