/**
 * Deterministic extraction of the contact details a reader needs.
 *
 * The model may propose people, offices and addresses, but it may not be
 * trusted to copy an email address or a phone number correctly: one wrong
 * digit and the reader calls the wrong office. So the values that can be
 * found mechanically are found here, by looking at the source text, and the
 * model's proposals are only accepted when they match something the source
 * actually contains.
 */

export type ContactKind = "email" | "phone" | "address" | "website" | "person" | "organization" | "other";

export interface ExtractedContact {
  label: string;
  value: string;
  kind: ContactKind;
  /** The text in the document the value came from. */
  quote: string;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Ethiopian mobile (09/07 + 7 digits, or +251 9x ...) and international numbers.
const PHONE_RE = /(?:\+251|0)\s?(?:9|7)\d{2}[\s-]?\d{3}[\s-]?\d{3}|\+\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,4}){1,4}/g;
const WEBSITE_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
// Street, building and office lines.
const ADDRESS_RE = /\b[^\n.!?]*\b(?:street|st\.|road|rd\.|avenue|ave\.|boulevard|blvd\.|lane|building|bldg\.|office|P\.?\s?O\.?\s?Box|post office|district|woreda|town|city)\b[^\n.!?]*/gi;

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** The sentence around a match, used as the quote that proves where it came from. */
function contextAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length + 90);
  let quote = text.slice(start, end).trim();
  // Trim to the sentence boundaries so the quote reads like a sentence.
  const firstStop = quote.search(/[.!?]\s/);
  if (firstStop > 0 && firstStop < 30) quote = quote.slice(firstStop + 1).trim();
  const lastStop = quote.search(/[.!?](\s|$)/);
  if (lastStop > 0) quote = quote.slice(0, lastStop + 1).trim();
  return quote.slice(0, 400);
}

export function extractContacts(text: string): ExtractedContact[] {
  if (!text) return [];
  const found: ExtractedContact[] = [];

  for (const match of text.matchAll(EMAIL_RE)) {
    const value = match[0].replace(/[.,;]$/, "");
    found.push({
      label: "Email",
      value,
      kind: "email",
      quote: contextAround(text, match.index ?? 0, value.length),
    });
  }

  for (const match of text.matchAll(PHONE_RE)) {
    const value = match[0].trim().replace(/[.,;]$/, "");
    // A bare year or a short number is not a phone number.
    if (value.replace(/\D/g, "").length < 9) continue;
    found.push({
      label: "Phone",
      value,
      kind: "phone",
      quote: contextAround(text, match.index ?? 0, value.length),
    });
  }

  for (const match of text.matchAll(WEBSITE_RE)) {
    const value = match[0].replace(/[.,;]$/, "");
    found.push({
      label: "Website",
      value,
      kind: "website",
      quote: contextAround(text, match.index ?? 0, value.length),
    });
  }

  for (const match of text.matchAll(ADDRESS_RE)) {
    const value = match[0].replace(/\s+/g, " ").trim();
    if (value.length < 6 || value.length > 200) continue;
    found.push({
      label: "Address",
      value,
      kind: "address",
      quote: value,
    });
  }

  return unique(found, (c) => `${c.kind}:${c.value.toLowerCase()}`);
}

/**
 * Dates, amounts and contacts found in a document.
 *
 * Dates and amounts are also found by the verifier; this is the cheap
 * pre-pass used to seed the search.
 */
export function extractEntities(text: string): { dates: string[]; amounts: string[]; contacts: ExtractedContact[] } {
  const dates = Array.from(text.matchAll(/\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g)).map(
    (m) => m[0]
  );
  const amounts = Array.from(text.matchAll(/\b\d[\d,.]*\s?(?:ETB|USD|EUR|GBP|Birr|\$|€|£)?\b/g))
    .map((m) => m[0].trim())
    .filter((v) => /\d/.test(v));
  return { dates, amounts, contacts: extractContacts(text) };
}
