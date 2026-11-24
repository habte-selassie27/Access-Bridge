/**
 * On-device prompt budget (AGENTS.md §3/§8: documented 9,216-token limit).
 *
 * We use a conservative character-based estimate (~4 chars/token) and reserve
 * headroom for the system prompt + structured output so we never silently
 * truncate material critical to deadlines or eligibility.
 */
export const LOCAL_MAX_TOKENS = 9216;
/** Reserve for system instruction + JSON output. */
const RESERVED_TOKENS = 2048;
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Max source characters that safely fit a local request. */
export const LOCAL_MAX_SOURCE_CHARS = (LOCAL_MAX_TOKENS - RESERVED_TOKENS) * CHARS_PER_TOKEN;

export function fitsLocalBudget(sourceText: string): boolean {
  return estimateTokens(sourceText) <= LOCAL_MAX_TOKENS - RESERVED_TOKENS;
}