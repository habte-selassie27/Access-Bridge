#!/usr/bin/env tsx
// Translate the bundled scholarship demo into Amharic, Oromo and Tigrinya
// through Adaption, so the demo copy comes from the same infrastructure the
// live explainer uses — not from a hand-written approximation.
//
// Usage: npx tsx scripts/translate-demo.ts demo-4
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { AdaptionClient } from "../server/lib/providers/adaption/adaption.client.ts";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const LANGUAGES = ["am", "om", "ti"] as const;
const id = process.argv[2] || "demo-4";
const demoPath = path.join(process.cwd(), "frontend/src/data/demo", `${id}.json`);
const demo = JSON.parse(fs.readFileSync(demoPath, "utf8"));
const en = demo.outputs.en;

const client = AdaptionClient.fromEnv();
if (!client) throw new Error("ADAPTION_API_KEY is not set (server-side only).");

const row = {
  messages: [
    { role: "user" as const, content: demo.source },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        docType: en.docType,
        summary: en.summary,
        actions: en.actions,
        eligibility: en.eligibility,
        howToApply: en.howToApply,
        deadlines: en.deadlines,
        costs: en.costs,
        documentsToBring: en.documentsToBring,
        confidence: en.confidence,
        warnings: en.warnings,
      }),
    },
  ],
};

const datasetId = await client.uploadRows([row], `accessbridge-${id}`);
console.log(`uploaded -> ${datasetId}`);

const importDeadline = Date.now() + 5 * 60 * 1000;
while (Date.now() < importDeadline) {
  const s = await client.status(datasetId);
  if (s.status === "failed") throw new Error(`import failed: ${JSON.stringify(s.error_data ?? {})}`);
  if ((s.row_count ?? 0) >= 1) break;
  await new Promise((r) => setTimeout(r, 10_000));
}

const run = await client.adapt(datasetId, {
  chatColumn: "messages",
  translateLanguages: [...LANGUAGES],
  sampleRate: 1,
});
console.log(`adapt run ${run.runId}: ~${run.estimatedMinutes} min, ${run.estimatedCredits} credits`);

await client.waitUntilReady(datasetId, { intervalMs: 15_000 });
const rows = await client.download(datasetId);
console.log(`downloaded ${rows.length} rows`);

function parsePrompt(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const user = parsed.find((m: any) => m?.role === "user");
      if (typeof user?.content === "string") return user.content;
    }
  } catch {
    return value;
  }
  return value;
}

function parseCompletion(value: unknown): any {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

for (const raw of rows) {
  const lang = String(raw.target_language_code ?? "en");
  if (lang === "original") continue;
  const completion = parseCompletion(raw.original_completion);
  if (!completion) {
    console.log(`skip ${lang}: unparseable completion`);
    continue;
  }
  // Adaption may nest the payload; take the object that has our fields.
  const payload = completion.explanation && typeof completion.explanation === "object" ? completion.explanation : completion;

  const output: any = {
    docType: payload.docType ?? en.docType,
    summary: String(payload.summary ?? en.summary),
    actions: Array.isArray(payload.actions) ? payload.actions : en.actions,
    eligibility: Array.isArray(payload.eligibility) ? payload.eligibility : en.eligibility,
    howToApply: Array.isArray(payload.howToApply) ? payload.howToApply : en.howToApply,
    deadlines: Array.isArray(payload.deadlines) ? payload.deadlines : en.deadlines,
    costs: Array.isArray(payload.costs) ? payload.costs : en.costs,
    documentsToBring: Array.isArray(payload.documentsToBring) ? payload.documentsToBring : en.documentsToBring,
    confidence: ["high", "medium", "low"].includes(String(payload.confidence)) ? payload.confidence : "high",
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    lang,
    originalText: demo.source,
  };
  demo.outputs[lang] = output;
  console.log(`translated ${lang}: ${output.summary.slice(0, 70)}...`);
}

fs.writeFileSync(demoPath, JSON.stringify(demo, null, 2) + "\n");
console.log(`wrote ${demoPath}`);
