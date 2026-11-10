#!/usr/bin/env tsx
// Measured baseline vs Adaption-few-shot evaluation.
//
// Test seeds are the authored corpus MINUS the rows the explainer uses as
// few-shot examples, so the adapted prompt never sees the test documents.
// Metrics are deterministic: schema validity, exact date/amount recovery
// against the golden explanations, and the app's own source verifier.

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { GroqAdapter } from "../server/lib/providers/llm/llm.adapter.ts";
import { ENV } from "../server/lib/config/env.ts";
import { normalizeModelOutput } from "../server/lib/transform.ts";
import { examplesForLanguage, formatExampleBlock, loadAdaptionDataset } from "../server/lib/services/adaption.service.ts";
import { ExplainResponseSchema } from "../frontend/src/lib/schema.ts";
import { runVerification } from "../frontend/src/lib/verify.ts";
import { EXPLAIN_SYSTEM, EXPLAIN_USER } from "../frontend/src/lib/prompts.ts";
import {
  buildFailures,
  buildLanguageMetrics,
  rowStatus,
  type EvalRow,
  type Variant,
} from "./eval-aggregate.ts";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const SEEDS_PATH = path.join(process.cwd(), "data/adaption/seeds.json");
const OUT_PATH = path.join(process.cwd(), "data/eval/results.json");
const PARTIAL_PATH = path.join(process.cwd(), "data/eval/partial.json");
const LANGS = ["am", "om", "ti"] as const;

const round = (n: number) => Math.round(n * 1000) / 1000;

function scriptOk(lang: string, text: string): boolean {
  const ethiopic = (text.match(/[\u1200-\u137F]/g) || []).length;
  const ascii = (text.match(/[A-Za-z]/g) || []).length;
  if (lang === "am" || lang === "ti") return ethiopic >= 10;
  if (lang === "om") return ethiopic === 0 && ascii >= 10;
  return ascii >= 10;
}

async function explainOnce(
  llm: GroqAdapter,
  seed: { text: string },
  lang: string,
  variant: Variant
): Promise<EvalRow> {
  const exampleBlock = variant === "adapted" ? formatExampleBlock(examplesForLanguage(lang, 3)) : "";
  const user = EXPLAIN_USER({ text: seed.text, lang, exampleBlock });
  try {
    let prompt = user;
    let parsed: any = null;
    let validation: any = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const content = await llm.complete(EXPLAIN_SYSTEM, prompt, 1600);
        const raw = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
        parsed = normalizeModelOutput(raw, seed.text, lang);
        validation = ExplainResponseSchema.safeParse(parsed);
        if (validation.success) break;
        prompt = `${user}\n\nPrevious output invalid. Errors: ${JSON.stringify(validation.error.flatten())}\nReturn JSON only.`;
      } catch (err) {
        lastError = err;
        prompt = `${user}\n\nPrevious output was invalid JSON. Return JSON only matching schema.`;
      }
    }
    if (!parsed || !validation?.success) throw lastError || new Error("schema invalid after retries");

    const deadlines = Array.isArray(parsed.deadlines) ? parsed.deadlines : [];
    const costs = Array.isArray(parsed.costs) ? parsed.costs : [];
    const { verifiedDeadlines, verifiedCosts } = runVerification(
      deadlines.map((d: any) => ({ label: d.label, date: d.date })),
      costs.map((c: any) => ({ label: c.label, amount: c.amount, currency: c.currency })),
      seed.text
    );
    const allFields = [...verifiedDeadlines, ...verifiedCosts];
    const verified = allFields.filter((f) => f.verified).length;

    const golden = (seed as any).explanation ?? { deadlines: [], costs: [] };
    const gotDates = new Set(deadlines.map((d: any) => String(d.date ?? "")));
    const gotAmounts = new Set(costs.map((c: any) => Number(c.amount)));
    const goldenDates = (golden.deadlines ?? []).map((d: any) => String(d.date ?? ""));
    const goldenAmounts = (golden.costs ?? []).map((c: any) => Number(c.amount));

    return {
      seedId: (seed as any).id,
      variant,
      lang,
      schemaValid: validation.success,
      dateAccuracy: goldenDates.length ? round(goldenDates.filter((d: string) => gotDates.has(d)).length / goldenDates.length) : null,
      amountAccuracy: goldenAmounts.length ? round(goldenAmounts.filter((a: number) => gotAmounts.has(a)).length / goldenAmounts.length) : null,
      verifiedRate: allFields.length ? round(verified / allFields.length) : null,
      hallucinatedFields: allFields.length - verified,
      languageScriptOk: scriptOk(lang, `${parsed.summary ?? ""} ${(parsed.actions ?? []).map((a: any) => a.step).join(" ")}`),
      rawSummary: String(parsed.summary ?? "").slice(0, 180),
    };
  } catch (err) {
    return {
      seedId: (seed as any).id,
      variant,
      lang,
      schemaValid: false,
      dateAccuracy: null,
      amountAccuracy: null,
      verifiedRate: null,
      hallucinatedFields: 0,
      languageScriptOk: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  if (!ENV.groqApiKey) throw new Error("GROQ_API_KEY is not set.");
  const dataset = loadAdaptionDataset();
  if (!dataset) throw new Error("Adaption cache missing. Run: npx tsx scripts/adaption-dataset.ts");

  const llm = new GroqAdapter(ENV.groqApiKey, "openai/gpt-oss-120b", { retries: 5, baseDelayMs: 15_000 });
  const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8")).rows as any[];
  const exampleSeedIds = new Set(
    LANGS.flatMap((lang) => examplesForLanguage(lang, 3).map((e) => e.seedId))
  );
  const tests = seeds.filter((s) => !exampleSeedIds.has(s.id));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const rows: EvalRow[] = [];
  const done = new Set<string>();
  if (fs.existsSync(PARTIAL_PATH)) {
    try {
      const partial = JSON.parse(fs.readFileSync(PARTIAL_PATH, "utf8"));
      if (partial.datasetId === dataset.datasetId && JSON.stringify(partial.heldOutSeeds) === JSON.stringify(tests.map((s) => s.id))) {
        for (const r of partial.rows || []) {
          rows.push(r);
          done.add(`${r.seedId}|${r.lang}|${r.variant}`);
        }
        console.log(`Resuming with ${rows.length} completed row(s)`);
      }
    } catch {
      // A corrupt partial file is ignored; the run starts over.
    }
  }

  console.log(`Evaluating ${tests.length} held-out seeds × ${LANGS.length} languages × 2 variants (Groq gpt-oss-120b)`);
  for (const seed of tests) {
    for (const lang of LANGS) {
      for (const variant of ["baseline", "adapted"] as const) {
        const key = `${seed.id}|${lang}|${variant}`;
        if (done.has(key)) continue;
        const result = await explainOnce(llm, seed, lang, variant);
        rows.push(result);
        done.add(key);
        fs.writeFileSync(PARTIAL_PATH, JSON.stringify({ datasetId: dataset.datasetId, heldOutSeeds: tests.map((s) => s.id), rows }, null, 2) + "\n");
        console.log(
          rowStatus(result) === "provider_error"
            ? `${seed.id} ${lang} ${variant}: NOT MEASURED (provider error)${result.error ? ` ${result.error}` : ""}`
            : `${seed.id} ${lang} ${variant}: schema=${result.schemaValid} date=${result.dateAccuracy} amount=${result.amountAccuracy} verified=${result.verifiedRate} hallucinated=${result.hallucinatedFields}${result.error ? ` err=${result.error}` : ""}`
        );
        await new Promise((r) => setTimeout(r, 8_000));
      }
    }
  }

  const byLang = buildLanguageMetrics(rows, LANGS);
  const failures = buildFailures(rows);
  const providerErrors = rows.filter((r) => rowStatus(r) === "provider_error").length;

  const payload = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    model: "openai/gpt-oss-120b",
    datasetId: dataset.datasetId,
    datasetBuiltAt: dataset.builtAt,
    heldOutSeeds: tests.map((s) => s.id),
    fewShotSeeds: [...exampleSeedIds],
    measuredRows: rows.length - providerErrors,
    providerErrors,
    languages: byLang,
    rows,
    failures,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  if (fs.existsSync(PARTIAL_PATH)) fs.rmSync(PARTIAL_PATH);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
