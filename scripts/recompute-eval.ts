#!/usr/bin/env tsx
// Recompute evaluation aggregates from the rows already saved in
// data/eval/results.json. Makes no provider calls and keeps generatedAt,
// so the numbers still describe the original measured run.

import fs from "node:fs";
import path from "node:path";
import { buildFailures, buildLanguageMetrics, rowStatus, type EvalRow } from "./eval-aggregate.ts";

const OUT_PATH = path.join(process.cwd(), "data/eval/results.json");
const LANGS = ["am", "om", "ti"] as const;

const raw = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
const rows: EvalRow[] = Array.isArray(raw.rows) ? raw.rows : [];
if (!rows.length) throw new Error("No rows in data/eval/results.json to aggregate.");

const providerErrors = rows.filter((r) => rowStatus(r) === "provider_error").length;
const languages = buildLanguageMetrics(rows, LANGS);

const payload = {
  ...raw,
  schemaVersion: 2,
  providerErrors,
  measuredRows: rows.length - providerErrors,
  languages,
  rows,
  failures: buildFailures(rows),
};

fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");

console.log(
  `Aggregated ${rows.length} row(s): ${rows.length - providerErrors} measured, ${providerErrors} not measured (provider error).`
);
for (const lang of LANGS) {
  const l = languages[lang];
  console.log(
    `${lang}: baseline ${l.baseline.nMeasured}/${l.baseline.n}, adapted ${l.adapted.nMeasured}/${l.adapted.n} | ` +
      `schema valid baseline ${l.baseline.schemaValidRate} adapted ${l.adapted.schemaValidRate} | ` +
      `date accuracy baseline ${l.baseline.dateAccuracy} adapted ${l.adapted.dateAccuracy}`
  );
}
