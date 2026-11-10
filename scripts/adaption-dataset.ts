#!/usr/bin/env tsx
// Rebuild Access-Bridge's few-shot dataset through the Adaption API.
//
// Flow: read data/adaption/seeds.json -> upload JSONL rows -> Adaption adapt
// with column_mapping + translate (am/om/ti) -> poll -> download -> cache.
// The cached file is committed so the explainer works offline and the eval is
// reproducible without spending Adaption credits again.
//
// Usage:
//   npx tsx scripts/adaption-dataset.ts                 # upload + adapt + cache
//   npx tsx scripts/adaption-dataset.ts --dataset ID    # cache an existing dataset
//
// Nothing here runs at request time; the server only reads the cache.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { AdaptionClient } from "../server/lib/providers/adaption/adaption.client.ts";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const SEEDS_PATH = path.join(process.cwd(), "data/adaption/seeds.json");
const OUT_PATH = path.join(process.cwd(), "data/adaption/dataset.json");
const MANIFEST_PATH = path.join(process.cwd(), "data/adaption/manifest.json");
const LANGUAGES = ["am", "om", "ti"] as const;
const DATASET_NAME = "access-bridge-seeds";

type SeedExplanation = {
  summary: string;
  actions: { step: string; urgent?: boolean }[];
  eligibility?: string[];
  howToApply?: string[];
  deadlines: { label: string; date: string | null }[];
  costs: { label: string; amount?: number; currency?: string }[];
  documentsToBring: string[];
};

type Seed = {
  id: string;
  docType: string;
  text: string;
  explanation: SeedExplanation;
};

type CachedRow = {
  language: string;
  seedId: string;
  docType: string;
  sourceText: string;
  explanation: {
    docType: string;
    summary: string;
    actions: { step: string; urgent: boolean }[];
    eligibility: string[];
    howToApply: string[];
    deadlines: { label: string; date: string | null }[];
    costs: { label: string; amount?: number; currency: string }[];
    documentsToBring: string[];
    confidence: "high" | "medium" | "low";
    warnings: string[];
  };
  adaptedBy: "adaption-translate";
};

function tokens(text: string): { dates: string[]; amounts: number[] } {
  const normalized = text.replace(/,/g, "");
  return {
    dates: [...new Set(normalized.match(/\d{4}-\d{2}-\d{2}/g) || [])].sort(),
    amounts: [
      ...new Set([
        ...[...normalized.matchAll(/(?:ETB|birr|ብር)\s*([\d.]+)/g)].map((m) => Number(m[1])),
        ...[...normalized.matchAll(/([\d.]+)\s*(?:ETB|birr|ብር)/g)].map((m) => Number(m[1])),
      ]),
    ].sort((a, b) => a - b),
  };
}

function scoreSeed(translatedText: string, seed: Seed): number {
  const got = tokens(translatedText);
  const want = tokens(seed.text);
  let score = 0;
  for (const d of got.dates) if (want.dates.includes(d)) score += 3;
  if (got.dates.length !== want.dates.length) score -= Math.abs(got.dates.length - want.dates.length);
  for (const a of got.amounts) if (want.amounts.includes(a)) score += 3;
  if (got.amounts.length !== want.amounts.length) score -= Math.abs(got.amounts.length - want.amounts.length);
  return score;
}

function parsePrompt(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const user = parsed.find((m) => m?.role === "user");
      if (typeof user?.content === "string") return user.content;
    }
  } catch {
    return value;
  }
  return value;
}

function assignRows(
  rows: { language: string; sourceText: string }[],
  seeds: Seed[]
): Map<number, { seed: Seed; score: number } | null> {
  const result = new Map<number, { seed: Seed; score: number } | null>();
  const byLanguage = new Map<string, number[]>();
  rows.forEach((row, i) => {
    const list = byLanguage.get(row.language) || [];
    list.push(i);
    byLanguage.set(row.language, list);
  });

  for (const indices of byLanguage.values()) {
    const pairs: { idx: number; seed: Seed; score: number }[] = [];
    for (const idx of indices) {
      for (const seed of seeds) pairs.push({ idx, seed, score: scoreSeed(rows[idx].sourceText, seed) });
    }
    pairs.sort((a, b) => b.score - a.score);
    const usedRows = new Set<number>();
    const usedSeeds = new Set<string>();
    for (const pair of pairs) {
      if (usedRows.has(pair.idx) || usedSeeds.has(pair.seed.id)) continue;
      if (pair.score <= 0) continue;
      usedRows.add(pair.idx);
      usedSeeds.add(pair.seed.id);
      result.set(pair.idx, { seed: pair.seed, score: pair.score });
    }
  }
  return result;
}

function parseCompletion(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeExplanation(raw: Record<string, unknown>, seed: Seed): CachedRow["explanation"] {
  const actions = Array.isArray(raw.actions)
    ? raw.actions.map((a) => ({
        step: String((a as Record<string, unknown>).step ?? ""),
        urgent: Boolean((a as Record<string, unknown>).urgent),
      })).filter((a) => a.step)
    : [];
  const deadlines = Array.isArray(raw.deadlines)
    ? raw.deadlines.map((d) => ({
        label: String((d as Record<string, unknown>).label ?? "Deadline"),
        date: (d as Record<string, unknown>).date != null ? String((d as Record<string, unknown>).date) : null,
      }))
    : [];
  const costs = Array.isArray(raw.costs)
    ? raw.costs.map((c) => ({
        label: String((c as Record<string, unknown>).label ?? "Cost"),
        amount: typeof (c as Record<string, unknown>).amount === "number"
          ? Number((c as Record<string, unknown>).amount)
          : undefined,
        currency: String((c as Record<string, unknown>).currency ?? "ETB"),
      }))
    : [];
  const documentsToBring = Array.isArray(raw.documentsToBring) ? raw.documentsToBring.map(String) : [];
  const eligibility = Array.isArray(raw.eligibility) ? raw.eligibility.map(String) : [];
  const howToApply = Array.isArray(raw.howToApply) ? raw.howToApply.map(String) : [];

  return {
    docType: seed.docType,
    summary: String(raw.summary ?? "").trim() || seed.explanation.summary,
    actions: actions.length ? actions : seed.explanation.actions.map((a) => ({ step: a.step, urgent: Boolean(a.urgent) })),
    eligibility: eligibility.length ? eligibility : (seed.explanation.eligibility ?? []),
    howToApply: howToApply.length ? howToApply : (seed.explanation.howToApply ?? []),
    deadlines,
    costs,
    documentsToBring,
    confidence: ["high", "medium", "low"].includes(String(raw.confidence)) ? (String(raw.confidence) as "high" | "medium" | "low") : "medium",
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const downloadOnly = args.includes("--download-only");
  const existingDatasetIndex = args.indexOf("--dataset");
  const existingDatasetId = existingDatasetIndex >= 0 ? args[existingDatasetIndex + 1] : null;
  if (existingDatasetIndex >= 0 && !existingDatasetId) throw new Error("--dataset requires a dataset id");

  const client = AdaptionClient.fromEnv();
  if (!client) throw new Error("ADAPTION_API_KEY is not set (server-side only).");

  const seedFile = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8")) as { rows: Seed[] };
  const seeds = seedFile.rows;
  if (!Array.isArray(seeds) || seeds.length === 0) throw new Error("No seed rows found");

  let datasetId = existingDatasetId;
  let runInfo: { runId: string | null; estimatedMinutes: number; estimatedCredits: number } | null = null;

  if (!datasetId) {
    const chatRows = seeds.map((seed) => ({
      messages: [
        { role: "user" as const, content: seed.text },
        {
          role: "assistant" as const,
          content: JSON.stringify({
            docType: seed.docType,
            summary: seed.explanation.summary,
            actions: seed.explanation.actions,
            eligibility: seed.explanation.eligibility ?? [],
            howToApply: seed.explanation.howToApply ?? [],
            deadlines: seed.explanation.deadlines,
            costs: seed.explanation.costs,
            documentsToBring: seed.explanation.documentsToBring,
            confidence: "high",
            warnings: [],
          }),
        },
      ],
    }));

    datasetId = await client.uploadRows(chatRows, `${DATASET_NAME}-${new Date().toISOString().slice(0, 10)}`);
    console.log(`Uploaded ${chatRows.length} rows -> dataset ${datasetId}`);

    // Adaption rejects /adapt while the upload is still importing.
    const importDeadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < importDeadline) {
      const s = await client.status(datasetId);
      console.log(`import status=${s.status} row_count=${s.row_count ?? "?"}`);
      if (s.status === "failed") throw new Error(`Dataset import failed: ${JSON.stringify(s.error_data ?? {})}`);
      if ((s.row_count ?? 0) >= chatRows.length) break;
      await new Promise((r) => setTimeout(r, 10_000));
    }

    runInfo = await client.adapt(datasetId, {
      chatColumn: "messages",
      translateLanguages: [...LANGUAGES],
      sampleRate: 1,
      idempotencyKey: `access-bridge-${randomUUID()}`,
    });
    console.log(
      `Adapt run ${runInfo.runId ?? "(pending)"}: estimated ${runInfo.estimatedMinutes} min, ${runInfo.estimatedCredits} credits`
    );
  }

  if (existingDatasetId && !runInfo && !downloadOnly) {
    const importDeadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < importDeadline) {
      const s = await client.status(datasetId);
      console.log(`import status=${s.status} row_count=${s.row_count ?? "?"}`);
      if (s.status === "failed") throw new Error(`Dataset import failed: ${JSON.stringify(s.error_data ?? {})}`);
      if ((s.row_count ?? 0) >= seeds.length) break;
      await new Promise((r) => setTimeout(r, 10_000));
    }
    runInfo = await client.adapt(datasetId, {
      chatColumn: "messages",
      translateLanguages: [...LANGUAGES],
      sampleRate: 1,
      idempotencyKey: `access-bridge-${randomUUID()}`,
    });
    console.log(`Adapt run ${runInfo.runId ?? "(pending)"}: estimated ${runInfo.estimatedMinutes} min, ${runInfo.estimatedCredits} credits`);
  }

  const ready = await client.waitUntilReady(datasetId, {
    intervalMs: 15_000,
    onPoll: (s) =>
      console.log(
        `status=${s.status} rows=${s.row_count ?? "?"} progress=${s.progress?.processed_rows ?? 0}/${s.progress?.total_rows ?? "?"}`
      ),
  });
  console.log(`Dataset ready: ${JSON.stringify(ready)}`);

  const rawRows = await client.download(datasetId);
  console.log(`Downloaded ${rawRows.length} row(s)`);

  const cached: CachedRow[] = [];
  const skipped: { language: string; reason: string }[] = [];
  const prepared = rawRows.map((raw) => {
    const rawLanguage = String(raw.target_language_code ?? "en");
    return {
      raw,
      language: rawLanguage === "original" ? "en" : rawLanguage,
      sourceText: parsePrompt(raw.original_prompt),
      completion: parseCompletion(raw.original_completion),
    };
  });
  const assignments = assignRows(prepared, seeds);

  for (const [i, row] of prepared.entries()) {
    const assignment = assignments.get(i);
    if (!row.sourceText || !row.completion || !assignment) {
      skipped.push({ language: row.language, reason: "unparseable row or unassigned seed" });
      continue;
    }
    cached.push({
      language: row.language,
      seedId: assignment.seed.id,
      docType: assignment.seed.docType,
      sourceText: row.sourceText,
      explanation: normalizeExplanation(row.completion, assignment.seed),
      adaptedBy: "adaption-translate",
    });
  }

  const byLanguage: Record<string, number> = {};
  for (const row of cached) byLanguage[row.language] = (byLanguage[row.language] || 0) + 1;

  const dataset = {
    datasetId,
    name: DATASET_NAME,
    source: "adaption-translate",
    builtAt: new Date().toISOString(),
    languages: ["en", ...LANGUAGES],
    rowCount: cached.length,
    rows: cached,
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + "\n");

  const manifest = {
    datasetId,
    name: DATASET_NAME,
    builtAt: dataset.builtAt,
    source: "adaption-translate",
    seeds: seeds.length,
    expectedRows: seeds.length * (LANGUAGES.length + 1),
    cachedRows: cached.length,
    rowsByLanguage: byLanguage,
    adaptRun: runInfo,
    skipped,
    seedFile: "data/adaption/seeds.json",
    cacheFile: "data/adaption/dataset.json",
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`Cache written: ${OUT_PATH} (${cached.length} rows by language: ${JSON.stringify(byLanguage)})`);
  if (skipped.length) console.warn(`Skipped rows: ${JSON.stringify(skipped)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
