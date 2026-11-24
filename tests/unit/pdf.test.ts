import { test } from "node:test";
import assert from "node:assert/strict";
import { getParser } from "../../frontend/src/lib/documents/pdf.ts";

// Unit-level check that the lazy pdf.js import is resolvable; full PDF parsing
// is an integration concern (requires a real PDF file) and is not faked here.
test("getParser returns the pdf.js module (lazy import)", async () => {
  const mod = await getParser();
  assert.ok(mod);
  assert.ok(mod.getDocument);
});