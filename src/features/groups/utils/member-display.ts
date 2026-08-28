/**
 * `GroupMember` (and `OrganizationMember`) only ever carry a `userId` — the
 * API has no user-profile lookup endpoint (bulk or single) besides `/me`
 * for the caller's own account. There is no real name or avatar to show
 * for anyone else's row; this derives a stable, distinct-looking
 * placeholder from the id instead of inventing fake data. See
 * docs/multi-tenancy.md (gestaofut-api) — flagged there as a contract gap.
 */
export function displayNameForMember(userId: string, currentUserId: string | undefined): string {
  if (currentUserId && userId === currentUserId) {
    return 'Você';
  }
  return `Jogador ${userId.slice(0, 8)}`;
}
