/**
 * Central registry of query keys. Every feature's queries should extend
 * this object instead of inlining ad-hoc arrays, so keys stay unique and
 * invalidation stays predictable as features are added.
 */
export const queryKeys = {
  system: {
    health: ['system', 'health'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  organizations: {
    list: ['organizations'] as const,
    members: (organizationId: string) => ['organizations', organizationId, 'members'] as const,
    groups: (organizationId: string) => ['organizations', organizationId, 'groups'] as const,
  },
  groups: {
    detail: (groupId: string) => ['groups', groupId] as const,
    settings: (groupId: string) => ['groups', groupId, 'settings'] as const,
    members: (groupId: string) => ['groups', groupId, 'members'] as const,
    memberHistory: (groupId: string, memberId: string) =>
      ['groups', groupId, 'members', memberId, 'history'] as const,
  },
  matches: {
    list: (groupId: string) => ['groups', groupId, 'matches'] as const,
    detail: (groupId: string, matchId: string) => ['groups', groupId, 'matches', matchId] as const,
    participants: (groupId: string, matchId: string) =>
      ['groups', groupId, 'matches', matchId, 'participants'] as const,
    roster: (groupId: string, matchId: string) => ['groups', groupId, 'matches', matchId, 'roster'] as const,
  },
  finance: {
    monthlyFees: (groupId: string) => ['groups', groupId, 'finance', 'monthly-fees'] as const,
    myMonthlyFees: (groupId: string) => ['groups', groupId, 'finance', 'monthly-fees', 'me'] as const,
    charges: (groupId: string) => ['groups', groupId, 'finance', 'charges'] as const,
    myCharges: (groupId: string) => ['groups', groupId, 'finance', 'charges', 'me'] as const,
    payments: (groupId: string) => ['groups', groupId, 'finance', 'payments'] as const,
    myPayments: (groupId: string) => ['groups', groupId, 'finance', 'payments', 'me'] as const,
    cashTransactions: (groupId: string) => ['groups', groupId, 'finance', 'cash-transactions'] as const,
    cashBalance: (groupId: string) => ['groups', groupId, 'finance', 'cash-transactions', 'balance'] as const,
  },
  events: {
    list: (groupId: string) => ['groups', groupId, 'events'] as const,
    detail: (groupId: string, eventId: string) => ['groups', groupId, 'events', eventId] as const,
    participants: (groupId: string, eventId: string) =>
      ['groups', groupId, 'events', eventId, 'participants'] as const,
    myEntitlement: (groupId: string, eventId: string) =>
      ['groups', groupId, 'events', eventId, 'entitlements', 'me'] as const,
  },
  dashboard: {
    detail: (groupId: string) => ['groups', groupId, 'dashboard'] as const,
  },
  notifications: {
    /** Root key — pass to `invalidateQueries`/`setQueriesData` to match every `list(...)` variant regardless of `unreadOnly`. */
    all: ['notifications'] as const,
    list: (unreadOnly?: boolean) => ['notifications', { unreadOnly: unreadOnly ?? false }] as const,
  },
} as const;
