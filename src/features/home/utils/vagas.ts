/** `null` capacity means unlimited (never "0 vagas"); otherwise never negative even if somehow over capacity. */
export function remainingSlots(capacity: number | null, confirmed: number): number | null {
  if (capacity === null) return null;
  return Math.max(capacity - confirmed, 0);
}
