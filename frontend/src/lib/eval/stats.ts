/**
 * Latency statistics for the live evaluation.
 *
 * Nearest-rank percentiles: p-th percentile is the smallest value such that at
 * least p% of samples are <= it. With small n this is coarse (p95 of 11 samples
 * is the 11th value), which is why the evaluation publishes n alongside every
 * percentile instead of implying a smooth distribution.
 */
export function percentile(values: number[], p: number): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

export function median(values: number[]): number | null {
  return percentile(values, 50);
}
