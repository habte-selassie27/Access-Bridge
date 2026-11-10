/**
 * Chunking and retrieval.
 *
 * A scholarship announcement is often tens of pages. Sending all of it in one
 * prompt is slow, expensive, and past a certain length the tail of the
 * document falls off the end of the context window — the deadline on page 30
 * silently disappears. So a long document is split into chunks, each chunk is
 * read on its own, and the results are merged.
 *
 * For questions, only the chunks that mention the thing being asked about
 * are sent back. The ranking is lexical (no embeddings, no extra provider
 * calls), which keeps the whole thing deterministic and free.
 */

export interface Chunk {
  index: number;
  text: string;
}

const DEFAULT_MAX_CHARS = 6000;
const DEFAULT_OVERLAP = 400;

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

/**
 * Rank chunks by how well they answer the question.
 *
 * A term that appears in only one chunk is worth much more than a term that
 * appears in all of them, which is the cheap version of what an embedding
 * model would do.
 */
export function rankChunks(query: string, chunks: Chunk[]): Chunk[] {
  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0) return chunks;

  const tokenized = chunks.map((c) => new Set(tokenize(c.text)));
  const documentFrequency = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const tokens of tokenized) if (tokens.has(term)) count++;
    documentFrequency.set(term, count);
  }

  const scored = chunks.map((chunk, i) => {
    const tokens = tokenized[i];
    let score = 0;
    for (const term of queryTerms) {
      if (!tokens.has(term)) continue;
      const df = documentFrequency.get(term) ?? 1;
      // Rare terms count for much more than common ones.
      score += Math.log(1 + chunks.length / df);
    }
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index)
    .filter((s) => s.score > 0)
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
    // No lexical match: fall back to the opening of the document, which is
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
