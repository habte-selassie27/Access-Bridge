/**
 * Hybrid evaluation harness (WP-056/057, AGENTS.md §14).
 *
 * Runs the DETERMINISTIC trust layer over an authored, non-sensitive corpus and
 * publishes reproducible offline metrics (schema validity, verified-field
 * precision, false-verified rate). Live inference metrics (latency, actual
 * ON_DEVICE/IN_CLOUD source, offline-live count) are produced by the in-browser
 * HybridEval on real hardware and are NOT fabricated here.
 *
 * Output: docs/eval-results.json + console summary with denominators.
 */
import { writeFileSync } from "node:fs";
import { toFrontendResult } from "../frontend/src/lib/transform.ts";
import { ExplainResponseSchema } from "../frontend/src/lib/schema.ts";

interface Case {
  id: string;
  source: string;
  proposal: any;
  goldDeadlines: string[];
  goldCosts: number[];
  forged?: boolean;
}

const CASES: Case[] = [
  {
    id: "scholarship-en",
    source: "Application deadline: December 15, 2026. Application fee: 200 ETB. Award: 50,000 ETB per year.",
    proposal: {
      docType: "scholarship", summary: "Scholarship.", actions: [], eligibility: [], howToApply: [],
      deadlines: [{ label: "Application deadline", date: "December 15, 2026" }],
      costs: [{ label: "Application fee", amount: 200, currency: "ETB" }],
      documentsToBring: [], sections: [], glossary: [], contacts: [], examples: [],
      confidence: "high", warnings: [], lang: "en",
    },
    goldDeadlines: ["December 15, 2026"], goldCosts: [200],
  },
  {
    id: "fee-en",
    source: "Term 2 fees for Grade 9: 1,200 ETB, due by November 30, 2026. Late payment incurs a 100 ETB penalty.",
    proposal: {
      docType: "school", summary: "Fee notice.", actions: [], eligibility: [], howToApply: [],
      deadlines: [{ label: "Due", date: "November 30, 2026" }],
      costs: [{ label: "Fee", amount: 1200, currency: "ETB" }, { label: "Penalty", amount: 100, currency: "ETB" }],
      documentsToBring: [], sections: [], glossary: [], contacts: [], examples: [],
      confidence: "high", warnings: [], lang: "en",
    },
    goldDeadlines: ["November 30, 2026"], goldCosts: [1200, 100],
  },
  {
    id: "forged-verified",
    source: "Application deadline: December 15, 2026.",
    proposal: {
      docType: "scholarship", summary: "x", actions: [], eligibility: [], howToApply: [],
      deadlines: [{ label: "Fake", date: "2027-01-01", verified: true }],
      costs: [{ label: "Fake", amount: 999, currency: "ETB", verified: true }],
      documentsToBring: [], sections: [], glossary: [], contacts: [], examples: [],
      confidence: "high", warnings: [], lang: "en",
    },
    goldDeadlines: [], goldCosts: [], forged: true,
  },
];

let schemaValid = 0;
let falseVerified = 0;
let verifiedTotal = 0;
let goldMatched = 0;
let goldTotal = 0;
const rows: any[] = [];

for (const c of CASES) {
  const parsed = { ...c.proposal, originalText: c.source };
  const schemaOk = ExplainResponseSchema.safeParse(parsed).success;
  if (schemaOk) schemaValid++;
  const out = toFrontendResult(c.proposal, c.source);
  const vD = out.deadlines.filter((d: any) => d.verified).length;
  const vC = out.costs.filter((x: any) => x.verified).length;
  verifiedTotal += vD + vC;
  if (c.forged) falseVerified += vD + vC;
  // Gold association: each gold deadline/cost should be verified.
  for (const g of c.goldDeadlines) { goldTotal++; if (out.deadlines.some((d: any) => d.verified && String(d.originalValue).includes(g.slice(0, 4)))) goldMatched++; }
  for (const g of c.goldCosts) { goldTotal++; if (out.costs.some((x: any) => x.verified && x.amount === g)) goldMatched++; }
  rows.push({ id: c.id, schemaOk, verifiedDeadlines: vD, verifiedCosts: vC, forged: !!c.forged });
}

const result = {
  generatedAt: new Date().toISOString(),
  kind: "offline-deterministic-trust",
  note: "Live inference latency/source/offline metrics come from the in-browser HybridEval on real hardware; not fabricated here.",
  denominators: { cases: CASES.length, goldFields: goldTotal },
  metrics: {
    schemaValidity: schemaValid / CASES.length,
    falseVerifiedRate: falseVerified, // target 0
    verifiedFields: verifiedTotal,
    goldAssociation: goldTotal ? goldMatched / goldTotal : 1,
  },
  rows,
};

writeFileSync(new URL("../docs/eval-results.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.metrics, null, 2));
console.log(`cases=${CASES.length} goldFields=${goldTotal} falseVerified=${falseVerified} (target 0)`);
if (falseVerified !== 0) {
  console.error("FAIL: false-verified detected");
  process.exit(1);
}
console.log("ok: offline trust metrics written to docs/eval-results.json");