import { normalize } from "../../../frontend/src/lib/verify.ts";

/**
 * Traceability check for quoted evidence.
 *
 * The model is allowed to quote the document, but a quote it made up must
 * never reach the reader as if the document said it. A quote counts as
 * traceable when its normalised form appears in the normalised source, or when
 * every word of the quote appears in the source in the same order (which
 * tolerates whitespace and punctuation differences without losing the link to
 * the original).
 */
export function quoteIsTraceable(quote: string, source: string): boolean {
  if (!quote || !quote.trim()) return false;
  const normalizedQuote = normalize(quote).toLowerCase();
  const normalizedSource = normalize(source).toLowerCase();
  if (!normalizedQuote) return false;
  if (normalizedSource.includes(normalizedQuote)) return true;

  const quoteTokens = normalizedQuote.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (quoteTokens.length < 3) return false;
  const sourceTokens = normalizedSource.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  let cursor = 0;
  for (const token of quoteTokens) {
    const found = sourceTokens.indexOf(token, cursor);
    if (found === -1) return false;
    cursor = found + 1;
  }
  return true;
}

/** The span of the quote inside the original source, so the UI can highlight it. */
export function findQuoteSpan(quote: string, source: string): [number, number] | null {
  if (!quote || !quote.trim()) return null;
  const index = source.indexOf(quote);
  if (index >= 0) return [index, index + quote.length];

  // Fall back to a word-by-word walk that ignores the difference between the
  // quote's spacing and the source's spacing.
  const sourceWords = [...source.matchAll(/\S+/g)];
  const quoteWords = quote.trim().split(/\s+/);
  for (let i = 0; i + quoteWords.length <= sourceWords.length; i++) {
    const window = sourceWords.slice(i, i + quoteWords.length);
    const matches = window.every((m, j) => {
      const a = m[0].replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      const b = quoteWords[j].replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      return a === b;
    });
    if (matches) {
      const start = window[0].index ?? 0;
      const last = window[window.length - 1];
      const end = (last.index ?? 0) + last[0].length;
      return [start, end];
    }
  }
  return null;
}
