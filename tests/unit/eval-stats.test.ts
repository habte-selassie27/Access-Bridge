import { test } from "node:test";
import assert from "node:assert/strict";
import { median, percentile } from "../../frontend/src/lib/eval/stats.ts";

test("percentile uses nearest rank", () => {
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(percentile([10, 20, 30, 40], 95), 40);
  assert.equal(percentile([10, 20, 30, 40], 0), 10);
  assert.equal(percentile([10, 20, 30, 40], 100), 40);
});

test("percentile ignores non-finite values and sorts input", () => {
  assert.equal(percentile([40, 10, Number.NaN, 30, 20], 50), 20);
  assert.equal(percentile([5], 95), 5);
});

test("empty samples have no percentile", () => {
  assert.equal(percentile([], 50), null);
  assert.equal(median([Number.NaN]), null);
});
