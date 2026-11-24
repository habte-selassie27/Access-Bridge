/**
 * Client-side long-document chunking (WP-021).
 *
 * Splits text into overlapping chunks that each fit the local prompt budget,
 * preserving absolute source offsets so evidence stays traceable to the
 * original. Merging is deterministic (dedupe), never model-authored, so no
 * fact is invented and coverage gaps are reported honestly.
 */
export interface Chunk {
  index: number;
  text: string;
  start: number;
  end: number;
}

export function chunkText(text: string, opts: { maxChars: number; overlap?: number }): Chunk[] {
  const maxChars = Math.max(200, opts.maxChars);
  const overlap = Math.min(opts.overlap ?? 200, Math.floor(maxChars / 4));
  const chunks: Chunk[] = [];
  let pos = 0;
  let index = 0;
  while (pos < text.length) {
    let end = Math.min(pos + maxChars, text.length);
    // Prefer to break at a newline/space near the boundary to keep sentences whole.
    if (end < text.length) {
      const slice = text.slice(pos, end);
      const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
      if (breakAt > maxChars / 2) end = pos + breakAt + 1;
    }
    chunks.push({ index, text: text.slice(pos, end), start: pos, end });
    if (end >= text.length) break;
    pos = end - overlap;
    index++;
  }
  return chunks;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

function dedupeBy<T>(values: T[], key: (v: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of values) {
    const k = key(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** Deterministically merge per-chunk explanations; never invents facts. */
export function mergeChunkResults(parts: any[], lang: string): any {
  const first = parts[0] || {};
  return {
    docType: first.docType || "other",
    summary: first.summary || "",
    actions: dedupeBy(parts.flatMap((p) => p.actions || []), (a: any) => `${a.step}`.toLowerCase()),
    eligibility: dedupeStrings(parts.flatMap((p) => p.eligibility || [])),
    howToApply: dedupeStrings(parts.flatMap((p) => p.howToApply || [])),
    deadlines: dedupeBy(parts.flatMap((p) => p.deadlines || []), (d: any) => `${d.label}|${d.date}`),
    costs: dedupeBy(parts.flatMap((p) => p.costs || []), (c: any) => `${c.label}|${c.amount}|${c.currency}`),
    documentsToBring: dedupeStrings(parts.flatMap((p) => p.documentsToBring || [])),
    sections: dedupeBy(parts.flatMap((p) => p.sections || []), (s: any) => `${s.title}`.toLowerCase()),
    glossary: dedupeBy(parts.flatMap((p) => p.glossary || []), (g: any) => `${g.term}`.toLowerCase()),
    contacts: dedupeBy(parts.flatMap((p) => p.contacts || []), (c: any) => `${c.kind}|${c.value}`.toLowerCase()),
    examples: dedupeStrings(parts.flatMap((p) => p.examples || [])),
    confidence: parts.some((p) => p.confidence === "low") ? "low" : parts.every((p) => p.confidence === "high") ? "high" : "medium",
    warnings: dedupeStrings(parts.flatMap((p) => p.warnings || [])),
    lang,
  };
}