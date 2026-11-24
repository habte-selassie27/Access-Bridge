/**
 * Gate G / WP-070: submission readiness checks (repo-side, no network).
 * Verifies license, README, runtime Firebase invocation, docs, and tests wiring.
 */
import { readFileSync, existsSync } from "node:fs";

const checks: Array<[string, boolean]> = [];
const has = (p: string) => existsSync(p);
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

checks.push(["LICENSE present", has("LICENSE")]);
checks.push(["README has How to test", /how to test/i.test(read("README.md"))]);
checks.push(["firebase dependency", /"firebase"/.test(read("frontend/package.json"))]);

const ai = read("frontend/src/lib/hybrid/ai.ts");
checks.push(["firebase/ai imported", ai.includes('from "firebase/ai"')]);
checks.push(["generateContent invoked", ai.includes("generateContent")]);
checks.push(["inferenceSource read", ai.includes("inferenceSource")]);
checks.push(["App Check initialized", ai.includes("initializeAppCheck")]);

const explain = read("frontend/src/lib/api/explain.ts");
checks.push(["explain uses hybrid", explain.includes("hybridGenerateStructured")]);
checks.push(["privacy policy gate", explain.includes("planRoute")]);

for (const d of ["BASELINE_AUDIT", "ARCHITECTURE", "PRIVACY_DATAFLOW", "TEST_MATRIX", "EVALUATION", "SUBMISSION", "DEMO_SCRIPT", "BUILD_PLAN"]) {
  checks.push([`docs/${d}.md`, has(`docs/${d}.md`)]);
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "ok" : "MISSING"}: ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} submission check(s) missing.`);
  process.exit(1);
}
console.log("\nAll repo-side submission checks passed. (Hosted URL / video / Devpost are manual.)");