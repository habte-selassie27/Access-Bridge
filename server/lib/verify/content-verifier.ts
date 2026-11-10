import { quoteIsTraceable } from "./quote-verifier.ts";
import { extractContacts } from "../extractors/entities.ts";

/**
 * Verification for the extra facts the model proposes.
 *
 * A glossary entry or a contact detail is only useful if it comes from the
 * document. An invented email address sends the reader to the wrong office,
 * and an invented definition of a legal term teaches them something false.
 * So both are checked against the source text, and anything that cannot be
 * traced is dropped rather than shown.
 */

function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.+]+/gu, "")
    .trim();
}

/** Does this value appear in the document? */
export function valueIsInSource(value: string, source: string): boolean {
  const needle = normalizeValue(value);
  if (needle.length < 3) return false;
  return normalizeValue(source).includes(needle);
}

export interface RawGlossaryEntry {
  term: string;
  meaning: string;
  quote?: string;
}

export interface RawContact {
  label: string;
  value: string;
  kind: string;
  quote?: string;
}

/**
 * Keep only the glossary entries that can be traced to the document.
 *
 * The term has to appear in the source, and the quote has to be found in it.
 */
export function verifyGlossary(
  entries: RawGlossaryEntry[],
  source: string
): { term: string; meaning: string; quote: string }[] {
  const out: { term: string; meaning: string; quote: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const term = String(entry?.term ?? "").trim();
    const meaning = String(entry?.meaning ?? "").trim();
    if (!term || !meaning) continue;
    const quote = String(entry?.quote ?? "").trim();
    const grounded = valueIsInSource(term, source) && (!quote || quoteIsTraceable(quote, source));
    if (!grounded) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ term, meaning, quote: quote && quoteIsTraceable(quote, source) ? quote : "" });
  }
  return out;
}

/**
 * The contacts the reader can trust.
 *
 * The model's proposals are accepted only when the value is really in the
 * document. Anything mechanically findable in the source (an email address, a
 * phone number, a website, an address) is added on top, so a detail the
 * model overlooked is still caught.
 */
export function verifyContacts(
  contacts: RawContact[],
  source: string
): { label: string; value: string; kind: string; quote: string }[] {
  const out: { label: string; value: string; kind: string; quote: string }[] = [];
  const seen = new Set<string>();

  const push = (label: string, value: string, kind: string, quote: string) => {
    const key = `${kind}|${normalizeValue(value)}`;
    if (!value.trim() || seen.has(key)) return;
    seen.add(key);
    out.push({ label, value, kind, quote });
  };

  for (const contact of contacts || []) {
    const value = String(contact?.value ?? "").trim();
    if (!value) continue;
    const quote = String(contact?.quote ?? "").trim();
    const grounded = valueIsInSource(value, source) || (quote && quoteIsTraceable(quote, source));
    if (!grounded) continue;
    push(String(contact?.label ?? "Contact").trim() || "Contact", value, contact?.kind || "other", quote);
  }

  for (const found of extractContacts(source)) {
    push(found.label, found.value, found.kind, found.quote);
  }

  return out;
}
