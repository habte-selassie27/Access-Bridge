export function formatGregorian(d: Date): string {
  return d.toISOString().slice(0, 10);
}
