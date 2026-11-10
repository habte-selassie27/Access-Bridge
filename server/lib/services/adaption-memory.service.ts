import { loadAdaptionDataset } from "./adaption.service.ts";
import { cosineSimilarity, embedText } from "../retrieval/chunker.ts";

/**
 * Vector retrieval over the Adaption-translated corpus.
 *
 * The few-shot block already gives the explainer translated patterns. The same
 * committed dataset is also a translation memory: every English seed has a
 * translated sibling with the same seed id. For a new passage, the closest
 * seed is retrieved by cosine similarity over local embeddings, and its
 * English/translated pair is sent with the translation prompt.
 *
 * This keeps the sponsor integration load-bearing for retrieval as well as
 * explanation, without a new provider call and without pretending the memory
 * is a fact source. The prompt says explicitly that the examples are patterns,
 * not facts about the document being translated.
 */
export interface TranslationMemoryPair {
  seedId: string;
  language: string;
  source: string;
  target: string;
  score: number;
}

const vectorCache = new Map<string, Float32Array>();

function vectorFor(text: string): Float32Array {
  const cached = vectorCache.get(text);
  if (cached) return cached;
  const vector = embedText(text);
  vectorCache.set(text, vector);
  return vector;
}

function clip(text: string, max = 700): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function retrieveTranslationMemory(
  text: string,
  lang: string,
  limit = 2
): TranslationMemoryPair[] {
  const dataset = loadAdaptionDataset();
  if (!dataset || lang === "en") return [];
  const english = new Map(
    dataset.rows.filter((row) => row.language === "en").map((row) => [row.seedId, row])
  );
  const query = vectorFor(text);
  if (text.trim().length === 0) return [];

  const pairs: TranslationMemoryPair[] = [];
  for (const row of dataset.rows) {
    if (row.language !== lang) continue;
    const source = english.get(row.seedId)?.sourceText || row.sourceText;
    const score = cosineSimilarity(query, vectorFor(source));
    if (score <= 0) continue;
    pairs.push({
      seedId: row.seedId,
      language: lang,
      source: clip(source),
      target: clip(row.sourceText),
      score,
    });
  }

  return pairs.sort((a, b) => b.score - a.score).slice(0, limit).filter((pair) => pair.score >= 0.12);
}

/**
 * A compact prompt block. The instruction is deliberately narrow: the model may
 * copy the style and terminology, never the facts.
 */
export function formatTranslationMemory(pairs: TranslationMemoryPair[]): string {
  if (pairs.length === 0) return "";
  return `\n\nReference translations from the Adaption dataset. They show the tone and terminology to use. They are NOT facts about the document above — never copy their dates, amounts or names.\n${pairs
    .map(
      (pair, i) =>
        `Example ${i + 1}:\nSource: ${pair.source}\nTranslation (${pair.language}): ${pair.target}`
    )
    .join("\n\n")}`;
}
