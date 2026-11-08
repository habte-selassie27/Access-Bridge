const counters = new Map<string, number>();
export function inc(name: string, by: number = 1): void {
  counters.set(name, (counters.get(name) || 0) + by);
}
export function getMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}
