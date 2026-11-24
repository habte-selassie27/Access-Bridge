import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText, mergeChunkResults } from "../../frontend/src/lib/documents/chunks.ts";

test("chunking preserves source offsets and coverage", async (t) => {
  await t.test("short text is a single chunk spanning the whole source", () => {
    const text = "Hello world.";
    const chunks = chunkText(text, { maxChars: 1000 });
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].start, 0);
    assert.equal(chunks[0].end, text.length);
  });
  await t.test("long text is split and every chunk maps back to the source", () => {
    const text = "Sentence one. Sentence two. ".repeat(500);
    const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
    assert.ok(chunks.length > 1);
    for (const c of chunks) {
      assert.equal(text.slice(c.start, c.end), c.text);
      assert.ok(c.text.length <= 500 + 1);
    }
    // Coverage: last chunk reaches the end.
    assert.equal(chunks[chunks.length - 1].end, text.length);
  });
});

test("merge is deterministic and never invents facts", async (t) => {
  await t.test("dedupes repeated deadlines/costs across chunks", () => {
    const a = { docType: "scholarship", summary: "s", deadlines: [{ label: "D", date: "2026-12-15" }], costs: [{ label: "F", amount: 200, currency: "ETB" }], actions: [], warnings: [] };
    const b = { ...a, deadlines: [{ label: "D", date: "2026-12-15" }], costs: [{ label: "F", amount: 200, currency: "ETB" }] };
    const m = mergeChunkResults([a, b], "en");
    assert.equal(m.deadlines.length, 1);
    assert.equal(m.costs.length, 1);
  });
  await t.test("union of distinct facts is preserved", () => {
    const a = { deadlines: [{ label: "D1", date: "2026-12-15" }], costs: [], actions: [], warnings: [] };
    const b = { deadlines: [{ label: "D2", date: "2027-01-01" }], costs: [], actions: [], warnings: [] };
    const m = mergeChunkResults([a, b], "en");
    assert.equal(m.deadlines.length, 2);
  });
});