import fs from "node:fs";
import path from "node:path";

export type FewShotExample = {
  language: string;
  seedId: string;
  docType: string;
  sourceText: string;
  explanation: {
    docType: string;
    summary: string;
    actions: { step: string; urgent: boolean }[];
    deadlines: { label: string; date: string | null }[];
    costs: { label: string; amount?: number; currency: string }[];
    documentsToBring: string[];
    confidence: "high" | "medium" | "low";
    warnings: string[];
  };
};

type CachedDataset = {
  datasetId: string;
  builtAt: string;
  source: "adaption-translate";
  rowCount: number;
  rows: FewShotExample[];
};

let cached: CachedDataset | null | undefined;

/**
 * Read the committed Adaption cache. Returns null (instead of throwing) when the
 * cache has not been built, so explanations work without the few-shot block too.
 */
export function loadAdaptionDataset(): CachedDataset | null {
  if (cached !== undefined) return cached;
  try {
    const file = path.join(process.cwd(), "data/adaption/dataset.json");
    if (!fs.existsSync(file)) {
      cached = null;
      return cached;
    }
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as CachedDataset;
    return cached;
  } catch {
    cached = null;
    return cached;
  }
}

/**
 * Pick a stable set of examples for a language. Prefer coverage across document
 * types so the model sees government, medical, financial, and school patterns.
 */
export function examplesForLanguage(lang: string, limit = 4): FewShotExample[] {
  const dataset = loadAdaptionDataset();
  if (!dataset) return [];
  const rows = dataset.rows.filter((r) => r.language === lang);
  const picked: FewShotExample[] = [];
  const seen = new Set<string>();

  const preferredTypes = ["government_notice", "medical", "financial", "school", "other"];
  for (const type of preferredTypes) {
    if (picked.length >= limit) break;
    const row = rows.find((r) => r.docType === type && !seen.has(r.seedId));
    if (row) {
      picked.push(row);
      seen.add(row.seedId);
    }
  }

  for (const row of rows) {
    if (picked.length >= limit) break;
    if (!seen.has(row.seedId)) {
      picked.push(row);
      seen.add(row.seedId);
    }
  }

  return picked;
}

export function formatExampleBlock(examples: FewShotExample[]): string {
  if (!examples.length) return "";
  return `\n\nFollow these example patterns. They are examples of the required JSON output,\nnot additional facts about the document above.\n${examples
    .map((ex, i) => {
      const compact = {
        docType: ex.explanation.docType,
        summary: ex.explanation.summary,
        actions: ex.explanation.actions,
        deadlines: ex.explanation.deadlines,
        costs: ex.explanation.costs,
        documentsToBring: ex.explanation.documentsToBring,
      };
      return `Example ${i + 1}:\nDocument: “${ex.sourceText}”\nExplanation JSON: ${JSON.stringify(compact)}`;
    })
    .join("\n\n")}`;
}
