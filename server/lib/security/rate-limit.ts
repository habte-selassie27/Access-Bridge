const buckets = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, maxPerMin: number = 30): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= maxPerMin) return false;
  b.count += 1;
  return true;
}
