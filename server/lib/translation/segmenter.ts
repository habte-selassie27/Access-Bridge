/**
 * Splitting text into pieces that can be translated one by one.
 *
 * A paragraph-by-paragraph translation keeps the reader's place in a long
 * document: they can read the original next to the translation and see
 * exactly which sentence says what.
 */

export interface Segment {
  index: number;
  text: string;
}

/** Split on blank lines. A single newline inside a paragraph is kept. */
export function splitParagraphs(text: string): Segment[] {
  const parts = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map((text, index) => ({ index, text }));
}

/**
 * Split into sentences.
 *
 * Handles the punctuation that actually ends a sentence in English and in
 * the languages we support, without splitting on a decimal point or on an
 * abbreviation like "No." or "Fig.".
 */
export function splitSentences(text: string): Segment[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const sentences: string[] = [];

  // A sentence ends at . ! ? or … followed by a space or the end of the text.
  const boundary = /[.!?…](?:["'”’)\]]*)(?=\s|$)/g;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = boundary.exec(clean)) !== null) {
    const end = match.index + match[0].length;
    const before = clean.slice(start, end);
    const punctuation = match[0][0];
    const after = clean.slice(end).replace(/^\s+/, "")[0] ?? "";

    // A decimal number ("300.50") is not a sentence end.
    if (punctuation === "." && /\d$/.test(before.slice(0, -1)) && /\d/.test(after)) continue;

    // An abbreviation ("Fig.", "No.", "Dr.") is not a sentence end. The single
    // letter rule is case sensitive on purpose: "ETB." ends in a capital but
    // it is a unit, not an initial.
    if (punctuation === "." && (/\b[A-Z]\.$/.test(before) || /\b(?:No|Nos|Dr|Mr|Mrs|Ms|Fig|Vol|Sec|Art|Pg|pp|vs|etc)\.$/i.test(before))) {
      continue;
    }

    const sentence = before.trim();
    if (sentence) sentences.push(sentence);
    start = end;
  }

  const tail = clean.slice(start).trim();
  if (tail) sentences.push(tail);

  return sentences.map((text, index) => ({ index, text }));
}
