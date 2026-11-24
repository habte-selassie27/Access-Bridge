/**
 * Client-side prompt-injection defense (AGENTS.md §13 / WP-019).
 * Document text is untrusted evidence, never commands.
 */

// Zero-width, bidi-override and BOM characters used to hide instructions.
const HIDDEN = new RegExp("[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]", "g");
// Control chars except newline/tab (the verifier relies on line breaks).
const CONTROL = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");

export function sanitizeText(input: string): string {
  return input.replace(HIDDEN, "").replace(CONTROL, " ").trim();
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\b[^.\n]*\binstructions/i,
  /disregard\b[^.\n]*\binstructions/i,
  /system prompt/i,
  /you are now/i,
  /act as (a|an) /i,
  /new (instructions|rules)/i,
  /<\/?(system|assistant|user)>/i,
  /\[system\]/i,
  /do not (follow|obey) (the|your) (rules|instructions)/i,
  /reveal (your|the) (prompt|instructions)/i,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

/** Wrap untrusted document content in explicit delimiters for the prompt. */
export function wrapUntrustedDocument(text: string): string {
  return `<<<DOCUMENT>>>\n${text}\n<<<END_DOCUMENT>>>`;
}