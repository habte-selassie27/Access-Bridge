import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { hydrateExplanation } from "./verification.ts";
import { 
  normalize,
  normalizeDigits,
  findDateSpans,
  findAmountSpans,
  verifyDeadline,
  verifyCost,
  sumAmounts,
  isRelativeDeadline,
  runVerification,
} from "./verify.ts";

describe("verify", () => {
  it("normalizes whitespace and Ge'ez digits", () => {
    assert.strictEqual(normalize("፩፪፳  hello   world  "), "1230 hello world");
    assert.strictEqual(normalizeDigits("፩፪፫"), "123");
    assert.strictEqual(normalizeDigits("abc"), "abc");
  });

  it("finds ISO date spans", () => {
    const spans = findDateSpans("Deadline is 2026-11-11 and 2026/12/01.");
    assert.strictEqual(spans.length, 2);
    assert.strictEqual(spans[0].text, "2026-11-11");
    assert.strictEqual(spans[0].start, 12);
  });

  it("finds month name dates", () => {
    const spans = findDateSpans("Due on November 5, 2026.");
    assert.strictEqual(spans.length, 1);
    assert.strictEqual(spans[0].text, "November 5, 2026");
  });

  it("detects relative deadlines", () => {
    assert.ok(isRelativeDeadline("within 30 days of receipt"));
    assert.ok(!isRelativeDeadline("due on 2026-11-11"));
  });

  it("verifies a deadline that appears in source", () => {
    const r = verifyDeadline("2026-11-11", "Deadline is 2026-11-11.");
    assert.strictEqual(r.verified, true);
    assert.strictEqual(r.matchedSource, "2026-11-11");
  });

  it("flags a deadline not in source as unverified", () => {
    const r = verifyDeadline("2026-12-25", "Deadline is 2026-11-11.");
    assert.strictEqual(r.verified, false);
    assert.ok(r.warning);
  });

  it("flags null deadline", () => {
    const r = verifyDeadline(null, "anything");
    assert.strictEqual(r.verified, false);
  });

  it("finds amount spans with currency", () => {
    const spans = findAmountSpans("Pay ETB 1,200.50 or $20.");
    assert.strictEqual(spans.length, 2);
    assert.strictEqual(spans[0].amount, 1200.5);
    assert.strictEqual(spans[0].currency, "ETB");
    assert.strictEqual(spans[1].amount, 20);
    assert.strictEqual(spans[1].currency, "USD");
  });

  it("verifies a cost that appears in source", () => {
    const r = verifyCost(1200.5, "ETB", "Pay ETB 1,200.50.");
    assert.strictEqual(r.verified, true);
  });

  it("flags an amount not in source", () => {
    const r = verifyCost(9999, "ETB", "Pay ETB 1,200.50.");
    assert.strictEqual(r.verified, false);
  });

  it("sums amounts and rounds once", () => {
    assert.strictEqual(sumAmounts([0.1, 0.2]), 0.3);
    assert.strictEqual(sumAmounts([1, 2, 3]), 6);
  });

  it("runVerification returns verified flags and warnings", () => {
    const res = runVerification(
      [{ label: "due", date: "2026-11-11" }],
      [{ label: "fee", amount: 100, currency: "ETB" }],
      "due on 2026-11-11. fee ETB 100."
    );
    assert.strictEqual(res.verifiedDeadlines[0].verified, true);
    assert.strictEqual(res.verifiedCosts[0].verified, true);
    assert.strictEqual(res.warnings.length, 0);
  });

  it("handles empty input", () => {
    assert.strictEqual(findDateSpans("").length, 0);
    assert.strictEqual(findAmountSpans("").length, 0);
    const r = verifyDeadline("2026-01-01", "");
    assert.strictEqual(r.verified, false);
  });
});

describe("demo verification", () => {
  const DEMO_DIR = new URL("../data/demo/", import.meta.url);
  const IDS = ["demo-1", "demo-2", "demo-3"];
  const LANGS = ["en", "am", "om", "ti"] as const;

  function loadDemo(id: string) {
    return JSON.parse(fs.readFileSync(new URL(`${id}.json`, DEMO_DIR), "utf8"));
  }

  it("recomputes every bundled demo field from its source text", () => {
    for (const id of IDS) {
      const doc = loadDemo(id);
      for (const lang of LANGS) {
        const out = doc.outputs[lang];
        const hydrated = hydrateExplanation(doc.source, out);
        const fields = [...hydrated.deadlines, ...hydrated.costs];
        assert.ok(fields.length > 0, `${id}:${lang} has no checkable fields`);
        for (const field of fields) {
          assert.strictEqual(field.verified, true, `${id}:${lang} "${field.label}" should verify against the source`);
          assert.ok(field.evidence, `${id}:${lang} "${field.label}" is missing evidence`);
          assert.strictEqual(
            doc.source.slice(field.evidence.sourceSpan[0], field.evidence.sourceSpan[1]),
            field.evidence.quote,
            `${id}:${lang} evidence span does not point at its quote`
          );
          assert.strictEqual(field.warning, null);
        }
        assert.strictEqual(hydrated.confidence, "high", `${id}:${lang} should be high confidence`);
      }
    }
  });

  it("flips a tampered date to unverified instead of trusting the file", () => {
    const doc = loadDemo("demo-1");
    const tampered = structuredClone(doc.outputs.en);
    tampered.deadlines[0].date = "2026-12-16";
    const hydrated = hydrateExplanation(doc.source, tampered);
    assert.strictEqual(hydrated.deadlines[0].verified, false);
    assert.strictEqual(hydrated.deadlines[0].evidence, null);
    assert.match(String(hydrated.deadlines[0].warning), /not found/i);
    assert.notStrictEqual(hydrated.confidence, "high");
    assert.ok(hydrated.warnings.length > 0);
  });

  it("flips a tampered amount to unverified", () => {
    const doc = loadDemo("demo-3");
    const tampered = structuredClone(doc.outputs.en);
    tampered.costs[0].amount = 3999;
    const hydrated = hydrateExplanation(doc.source, tampered);
    assert.strictEqual(hydrated.costs[0].verified, false);
    assert.strictEqual(hydrated.costs[0].evidence, null);
    assert.match(String(hydrated.costs[0].warning), /not found/i);
  });

  it("does not verify an amount in the wrong currency", () => {
    const hydrated = hydrateExplanation("Pay ETB 500 by 2026-12-01.", {
      costs: [{ label: "Fee", amount: 500, currency: "USD" }],
    });
    assert.strictEqual(hydrated.costs[0].verified, false);
  });

  it("keeps a relative deadline visible but unverified", () => {
    const hydrated = hydrateExplanation("Your final pay is paid within 30 days of receipt.", {
      deadlines: [{ label: "Final pay", date: "within 30 days of receipt" }],
    });
    const deadline = hydrated.deadlines[0];
    assert.strictEqual(deadline.verified, false);
    assert.strictEqual(deadline.deadlineType, "relative");
    assert.strictEqual(deadline.originalValue, "within 30 days of receipt");
    assert.match(String(deadline.warning), /relative/i);
    assert.strictEqual(hydrated.confidence, "low");
  });

  it("never raises confidence above what the caller claims", () => {
    const hydrated = hydrateExplanation("Due on 2026-12-01.", {
      deadlines: [{ label: "Due", date: "2026-12-01" }],
      confidence: "low",
    });
    assert.strictEqual(hydrated.deadlines[0].verified, true);
    assert.strictEqual(hydrated.confidence, "low");
  });
});
