/**
 * Central registry of query keys. Every feature's queries should extend
 * this object instead of inlining ad-hoc arrays, so keys stay unique and
 * invalidation stays predictable as features are added.
 */
export const queryKeys = {
  system: {
    health: ['system', 'health'] as const,
  },
} as const;
