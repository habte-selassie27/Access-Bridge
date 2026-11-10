#!/usr/bin/env tsx
// Fetch Adaption's own quality report for the committed dataset.
//
// This is deliberately separate from scripts/eval-ab.ts:
//   - eval-ab.ts measures Access-Bridge's prompts on held-out documents.
//   - this script records what Adaption says about the dataset it produced.
// /eval shows both, labelled, and never averages them together.
//
// Usage: npx tsx scripts/adaption-evaluate.ts
// Requires ADAPTION_API_KEY and data/adaption/dataset.json.

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { AdaptionClient } from "../server/lib/providers/adaption/adaption.client.ts";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const DATASET_PATH = path.join(process.cwd(), "data/adaption/dataset.json");
const OUT_PATH = path.join(process.cwd(), "data/adaption/evaluation.json");

async function main() {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error("data/adaption/dataset.json is missing. Run scripts/adaption-dataset.ts first.");
  }
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8")) as { datasetId?: string };
  if (!dataset.datasetId) throw new Error("The cached dataset has no datasetId.");

  const client = AdaptionClient.fromEnv();
  if (!client) throw new Error("ADAPTION_API_KEY is not set (server-side only).");

  const report = await client.evaluation(dataset.datasetId);
  if (!report) {
    throw new Error(`Adaption has no evaluation report for dataset ${dataset.datasetId} yet.`);
  }

  const payload = {
    datasetId: dataset.datasetId,
    fetchedAt: new Date().toISOString(),
    source: "adaption-evaluation-endpoint",
    report,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
