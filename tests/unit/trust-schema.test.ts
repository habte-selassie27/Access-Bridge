import { test } from "node:test";
import assert from "node:assert/strict";
import { toFrontendResult, normalizeModelOutput } from "../../frontend/src/lib/transform.ts";
import { ExplainResponseSchema } from "../../frontend/src/lib/schema.ts";

const SOURCE = "Application deadline: December 15, 2026. Application fee: 200 ETB.";

test("verification is recomputed, never inherited from the model", async (t) => {
  await t.test("forged verified:true with a date NOT in source stays unverified", () => {
    const model = {
      docType: "scholarship",
      summary: "x",
      actions: [],
      deadlines: [{ label: "Deadline", date: "2027-01-01", verified: true }],
      costs: [],
      documentsToBring: [],
      confidence: "high",
      warnings: [],
      lang: "en",
    };
    const out = toFrontendResult(model, SOURCE);
    assert.equal(out.deadlines[0].verified, false);
  });

  await t.test("a date present in source becomes verified with evidence", () => {
    const model = {
      docType: "scholarship",
      summary: "x",
      actions: [],
      deadlines: [{ label: "Deadline", date: "December 15, 2026", verified: false }],
      costs: [],
      documentsToBring: [],
      confidence: "high",
      warnings: [],
      lang: "en",
    };
    const out = toFrontendResult(model, SOURCE);
    assert.equal(out.deadlines[0].verified, true);
    assert.ok(out.deadlines[0].evidence);
  });

  await t.test("forged verified cost not in source stays unverified", () => {
    const model = {
      docType: "financial",
      summary: "x",
      actions: [],
      deadlines: [],
      costs: [{ label: "Fee", amount: 999, currency: "ETB", verified: true }],
      documentsToBring: [],
      confidence: "high",
      warnings: [],
      lang: "en",
    };
    const out = toFrontendResult(model, SOURCE);
    assert.equal(out.costs[0].verified, false);
  });
});

test("schema rejects malformed model output", async (t) => {
  await t.test("missing required fields fails validation", () => {
    const r = ExplainResponseSchema.safeParse({ summary: "x" });
    assert.equal(r.success, false);
  });
  await t.test("normalizeModelOutput tolerates fenced/odd shapes then validates", () => {
    const raw = { docType: "scholarship", summary: " ok ", actions: ["Apply"], deadlines: [], costs: [], documentsToBring: [], confidence: "high", warnings: [], lang: "en" };
    const norm = normalizeModelOutput(raw, SOURCE, "en");
    const r = ExplainResponseSchema.safeParse({ ...norm, originalText: SOURCE });
    assert.equal(r.success, true);
  });
});