import { test } from "node:test";
import assert from "node:assert/strict";

// Integration check: the Firebase AI Logic adapter imports and degrades
// cleanly when unconfigured (this test can run offline). Live
// generateContent is exercised on real hardware (Gate C) — not here.
test("hybrid adapter is importable and degrades when not configured", async () => {
  const { isHybridReady, initHybrid, getHybridModel } = await import("../../frontend/src/lib/hybrid/ai.ts");
  const { isHybridConfigured } = await import("../../frontend/src/lib/hybrid/config.ts");
  initHybrid();
  assert.ok(typeof isHybridConfigured() === "boolean");
  // If configured (from .env.local in this environment), readiness may be true;
  // if not, it must be false with a null model.
  const ready = isHybridReady();
  const model = getHybridModel();
  if (!isHybridConfigured()) {
    assert.equal(ready, false);
    assert.equal(model, null);
  } else {
    assert.ok(ready);
    assert.ok(model);
  }
});