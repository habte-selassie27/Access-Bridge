import { describe, it } from "node:test";
import assert from "node:assert";
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
