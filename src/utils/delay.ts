/** Simulates network latency for stub flows that don't call a real API yet. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
