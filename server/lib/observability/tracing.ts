export function traceId(): string {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
