/**
 * Chunking and retrieval.
 *
 * A scholarship announcement is often tens of pages. Sending all of it in one
 * prompt is slow, expensive, and past a certain length the tail of the
 * document falls off the end of the context window — the deadline on page 30
 * silently disappears. So a long document is split into chunks, each chunk is
 * read on its own, and the results are merged.
 *
 * For questions, only the parts that mention the thing being asked about are
 * sent back. Ranking uses dense vector embeddings computed locally: tokens and
 * character n-grams are feature-hashed into a fixed-size vector, weighted by
 * inverse document frequency, and compared with cosine similarity. No model
 * call, no API key, and no network are needed, so retrieval keeps working in
 * demo mode and with low-resource scripts.
 */

export interface Chunk {
  index: number;
  text: string;
}

export const DEFAULT_MAX_CHARS = 6000;
export const DEFAULT_OVERLAP = 400;

/** Split on paragraph boundaries, then repack into chunks of about `maxChars`. */
export function chunkText(
  text: string,
  { maxChars = DEFAULT_MAX_CHARS, overlap = DEFAULT_OVERLAP }: { maxChars?: number; overlap?: number } = {}
): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [{ index: 0, text: clean }];

  const paragraphs = clean
    .split(/\n{2,}/)
    .flatMap((p) => p.split(/\n/))
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    // A single very long paragraph is split on sentence boundaries.
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push({ index: chunks.length, text: current });
        current = "";
      }
      let rest = paragraph;
      while (rest.length > maxChars) {
        const window = rest.slice(0, maxChars);
        const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("; "), window.lastIndexOf(", "));
        const splitAt = cut > maxChars * 0.5 ? cut + 1 : maxChars;
        chunks.push({ index: chunks.length, text: rest.slice(0, splitAt).trim() });
        rest = rest.slice(splitAt).trim();
      }
      if (rest) current = rest;
      continue;
    }

    if (current.length + paragraph.length + 2 > maxChars) {
      chunks.push({ index: chunks.length, text: current });
      // Repeat the tail so a fact split across the boundary is still found.
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail ? `${tail}\n${paragraph}` : paragraph;
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push({ index: chunks.length, text: current.trim() });
  return chunks;
}

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","do","does","did","have","has","had",
  "i","me","my","we","our","you","your","he","she","it","they","them","their","this","that","these",
  "those","and","or","but","if","then","else","when","where","what","which","who","whom","how","why",
  "in","on","at","to","for","of","with","by","from","as","about","into","over","after","before",
  "can","could","should","would","will","shall","may","might","must","not","no","yes","it","its",
  "document","paper","notice","text","please","tell","give","show","does","much","many","need","want",
]);

/**
 * Small synonym sets for the concepts readers actually ask about. They are
 * folded into the embedding so "cost" can find a paragraph that only says
 * "fee", without a keyword rule deciding the answer.
 */
const SYNONYMS: Record<string, string[]> = {
  fee: ["cost", "payment", "charge", "price"],
  cost: ["fee", "payment", "charge", "price"],
  payment: ["fee", "cost", "pay"],
  price: ["fee", "cost", "charge"],
  deadline: ["due", "closing", "cutoff", "last", "date"],
  due: ["deadline", "closing", "cutoff"],
  closing: ["deadline", "due", "cutoff"],
  apply: ["application", "applicant", "submit", "register"],
  application: ["apply", "applicant", "submit"],
  applicant: ["apply", "application", "candidate"],
  scholarship: ["grant", "fellowship", "bursary", "funding"],
  grant: ["scholarship", "funding", "bursary"],
  fellowship: ["scholarship", "grant", "funding"],
  document: ["documents", "paper", "papers", "certificate", "record"],
  documents: ["document", "paper", "papers", "certificate", "record"],
  certificate: ["document", "documents", "record"],
  requirement: ["require", "required", "must", "eligibility"],
  eligible: ["eligibility", "qualify", "requirement"],
  contact: ["email", "phone", "call", "office", "address"],
  office: ["contact", "address", "branch"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => {
      if (!t) return false;
      // Numbers are kept even when they are short: "section 7" is a real
      // reference, and dropping it would make the ranking ignore the one
      // thing the question was about.
      if (/^\d+$/.test(t)) return true;
      return t.length > 2 && !STOPWORDS.has(t);
    });
}

/** Fixed-size feature vector. 512 keeps collisions low without a model. */
export const EMBEDDING_DIM = 512;

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function addFeature(vector: Float32Array, feature: string, weight: number): void {
  const hash = fnv1a(feature);
  const index = hash % EMBEDDING_DIM;
  // Signed hashing: collisions cancel instead of always adding mass.
  const sign = (hash & 0x80000000) === 0 ? 1 : -1;
  vector[index] += sign * weight;
}

function expandedTerms(token: string): string[] {
  const synonyms = SYNONYMS[token];
  return synonyms ? [token, ...synonyms] : [token];
}

/**
 * Embed a piece of text.
 *
 * `idf` is optional: when ranking against a set of chunks it down-weights
 * terms that appear everywhere. Without it, the vector is a plain
 * term-frequency representation, which is still useful for comparing two
 * short passages (for example the Adaption translation memory).
 */
export function embedText(text: string, idf?: Map<string, number>): Float32Array {
  const vector = new Float32Array(EMBEDDING_DIM);
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    for (const term of expandedTerms(token)) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }

  for (const [term, count] of counts) {
    const idfWeight = idf?.get(term) ?? 1;
    const weight = (1 + Math.log(count)) * idfWeight;
    addFeature(vector, `w:${term}`, weight);
    // Character n-grams catch morphology and spelling variation that whole
    // tokens miss (Amharic affixes, Oromo suffixes, transliterations).
    if (term.length >= 4) {
      const padded = `^${term}$`;
      for (let i = 0; i + 3 <= padded.length; i++) {
        addFeature(vector, `c:${padded.slice(i, i + 3)}`, weight * 0.35);
      }
    }
  }

  let norm = 0;
  for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  }
  return vector;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Rank chunks by vector similarity to the question.
 *
 * The vectors are built from the chunks themselves, so terms that appear in
 * only one chunk carry more weight — the same effect TF-IDF gives, but in a
 * fixed-size space that cosine similarity can compare.
 */
export function rankChunks(query: string, chunks: Chunk[]): Chunk[] {
  if (chunks.length === 0) return [];
  const tokenized = chunks.map((c) => tokenize(c.text));
  // One pass per chunk: add each term once, no matter how often it occurs.
  // The old nested scan was O(vocabulary x tokens x chunks), which made a
  // question over a long document noticeably slow.
  const documentFrequency = new Map<string, number>();
  for (const tokens of tokenized) {
    const seen = new Set<string>();
    for (const token of tokens) {
      for (const term of expandedTerms(token)) seen.add(term);
    }
    for (const term of seen) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, df] of documentFrequency) {
    idf.set(term, Math.log(1 + chunks.length / Math.max(1, df)));
  }

  const queryVector = embedText(query, idf);
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryVector, embedText(chunk.text, idf)),
  }));

  return scored
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index)
    .filter((s) => s.score > 0.015)
    .map((s) => s.chunk);
}

/**
 * The part of a document that is worth sending to the model for a question.
 *
 * A short document is sent whole. A long one is chunked and the best chunks
 * are returned in document order, so the answer still reads in sequence.
 */
export function selectRelevantContext(
  question: string,
  text: string,
  { maxChars = DEFAULT_MAX_CHARS, limit = 6 }: { maxChars?: number; limit?: number } = {}
): { context: string; chunkCount: number; usedChunks: number } {
  const clean = text.trim();
  if (!clean) return { context: "", chunkCount: 0, usedChunks: 0 };

  const chunks = chunkText(clean, { maxChars });
  if (chunks.length === 1) return { context: clean, chunkCount: 1, usedChunks: 1 };

  const ranked = rankChunks(question, chunks).slice(0, limit);
  if (ranked.length === 0) {
    // No vector match: fall back to the opening of the document, which is
    // where the title, the issuer and the summary usually are.
    const first = chunks.slice(0, 2).map((c) => c.text).join("\n\n");
    return { context: first, chunkCount: chunks.length, usedChunks: 2 };
  }

  // Back into document order so the answer follows the document's sequence.
  ranked.sort((a, b) => a.index - b.index);
  return {
    context: ranked.map((c) => c.text).join("\n\n"),
    chunkCount: chunks.length,
    usedChunks: ranked.length,
  };
}

export interface NamedDocument {
  title: string;
  text: string;
}

/**
 * The same, across several documents at once.
 *
 * Each selected chunk keeps the title of the document it came from, so a
 * question about two different announcements can be answered from both and
 * the model can say which is which.
 */
export function selectRelevantContextFromDocuments(
  question: string,
  documents: NamedDocument[],
  { maxChars = DEFAULT_MAX_CHARS, limit = 8 }: { maxChars?: number; limit?: number } = {}
): { context: string; chunkCount: number; usedChunks: number } {
  const usable = documents.filter((d) => d && d.text && d.text.trim());
  if (usable.length === 0) return { context: "", chunkCount: 0, usedChunks: 0 };
  if (usable.length === 1) {
    return selectRelevantContext(question, usable[0].text, { maxChars, limit });
  }

  const tagged: Chunk[] = [];
  let chunkCount = 0;
  for (const doc of usable) {
    const chunks = chunkText(doc.text, { maxChars });
    chunkCount += chunks.length;
    for (const chunk of chunks) {
      tagged.push({ index: tagged.length, text: `### ${doc.title}\n${chunk.text}` });
    }
  }

  const ranked = rankChunks(question, tagged).slice(0, limit);
  if (ranked.length === 0) {
    const first = tagged.slice(0, 2).map((c) => c.text).join("\n\n");
    return { context: first, chunkCount, usedChunks: 2 };
  }
  ranked.sort((a, b) => a.index - b.index);
  return {
    context: ranked.map((c) => c.text).join("\n\n"),
    chunkCount,
    usedChunks: ranked.length,
  };
}
