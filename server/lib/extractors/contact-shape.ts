/**
 * What a contact detail is allowed to look like.
 *
 * Shared by the extractor (which finds contacts in the text) and the verifier
 * (which decides whether a model's proposed contact is believable).
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[\d\s()+-]{7,20}$/;
export const WEBSITE_RE = /^(https?:\/\/|www\.)\S+$|^\S+\.\S{2,}$/i;

/** Words that show a phrase is a sentence, not a name or an address. */
const VERB_WORDS =
  /\b(is|are|was|were|be|been|will|shall|must|should|can|cannot|may|might|do|does|did|ask|asked|apply|applies|contact|send|submit|require|required|need|needed|open|closed|exclude|excluded|including|listed|published|available)\b/i;

/**
 * Is this value shaped like the kind of contact it claims to be?
 *
 * A model that copies badly produces fragments of a sentence ("Office hours
 * Monday to") and merges two fields ("2027.SECTION"). Those strings are
 * genuinely in the document, so a presence check alone is not enough: the
 * value also has to look like an address, a phone number or an email address.
 */
export function looksLikeContact(kind: string, value: string): boolean {
  const clean = value.trim();
  if (!clean) return false;
  const words = clean.split(/\s+/).filter(Boolean);

  if (EMAIL_RE.test(clean)) return kind === "email" || kind === "other";
  if (PHONE_RE.test(clean)) return kind === "phone" || kind === "other";
  if (WEBSITE_RE.test(clean) && !/\s/.test(clean)) return kind === "website" || kind === "other";

  // Anything else has to read like a name, an organisation or an address.
  if (words.length > 8) return false;
  if (/^(section|part|chapter|article)\b/i.test(clean)) return false;
  if (VERB_WORDS.test(clean)) return false;
  // A fragment that ends mid-clause.
  if (/\b(and|or|of|to|from|with|the|for|in|on|at)\s*$/i.test(clean)) return false;
  if (kind === "address") return words.length >= 2 && words.length <= 8;
  if (kind === "person" || kind === "organization") {
    return words.length >= 1 && words.length <= 6 && /^[A-Z]/.test(clean);
  }
  return words.length >= 1 && words.length <= 8;
}

/** Work out what a value actually is, rather than trusting the label. */
export function kindOfValue(value: string): string {
  const clean = value.trim();
  if (EMAIL_RE.test(clean)) return "email";
  if (PHONE_RE.test(clean)) return "phone";
  if (WEBSITE_RE.test(clean) && !/\s/.test(clean)) return "website";
  return "other";
}
