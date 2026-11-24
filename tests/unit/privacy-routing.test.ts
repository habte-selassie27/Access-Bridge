import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toSDKMode,
  requiresNetwork,
  requiresConsent,
  planRoute,
  sdkModeToInferenceModeName,
} from "../../frontend/src/lib/privacy/modes.ts";
import { fitsLocalBudget, estimateTokens, LOCAL_MAX_TOKENS } from "../../frontend/src/lib/hybrid/budget.ts";

test("privacy mode -> SDK mode mapping", async (t) => {
  await t.test("private is always ONLY_ON_DEVICE", () => {
    assert.equal(toSDKMode("private", false), "ONLY_ON_DEVICE");
    assert.equal(toSDKMode("private", true), "ONLY_ON_DEVICE");
  });
  await t.test("cloud is ONLY_IN_CLOUD", () => {
    assert.equal(toSDKMode("cloud", true), "ONLY_IN_CLOUD");
  });
  await t.test("smart without consent never allows cloud fallback", () => {
    assert.equal(toSDKMode("smart", false), "ONLY_ON_DEVICE");
  });
  await t.test("smart with consent prefers on-device", () => {
    assert.equal(toSDKMode("smart", true), "PREFER_ON_DEVICE");
  });
});

test("network / consent predicates", async (t) => {
  await t.test("private never requires network", () => {
    assert.equal(requiresNetwork("private", true), false);
  });
  await t.test("smart requires network only when consented", () => {
    assert.equal(requiresNetwork("smart", false), false);
    assert.equal(requiresNetwork("smart", true), true);
  });
  await t.test("cloud requires consent", () => {
    assert.equal(requiresConsent("cloud"), true);
    assert.equal(requiresConsent("private"), false);
  });
});

test("policy engine gates privacy before transfer", async (t) => {
  await t.test("private on unsupported device is blocked, not uploaded", () => {
    const p = planRoute({ mode: "private", consented: true, deviceAvailable: false, online: true });
    assert.equal(p.allowed, false);
    assert.equal(p.sdkMode, "ONLY_ON_DEVICE");
    assert.equal(p.reason, "private_unsupported_device");
  });
  await t.test("private on supported device runs locally", () => {
    const p = planRoute({ mode: "private", consented: false, deviceAvailable: true, online: false });
    assert.equal(p.allowed, true);
    assert.equal(p.sdkMode, "ONLY_ON_DEVICE");
  });
  await t.test("cloud without consent is blocked", () => {
    const p = planRoute({ mode: "cloud", consented: false, deviceAvailable: true, online: true });
    assert.equal(p.allowed, false);
    assert.equal(p.reason, "cloud_consent_required");
  });
  await t.test("cloud offline is blocked", () => {
    const p = planRoute({ mode: "cloud", consented: true, deviceAvailable: true, online: false });
    assert.equal(p.allowed, false);
    assert.equal(p.reason, "cloud_offline");
  });
  await t.test("smart without consent stays local", () => {
    const p = planRoute({ mode: "smart", consented: false, deviceAvailable: true, online: true });
    assert.equal(p.sdkMode, "ONLY_ON_DEVICE");
  });
  await t.test("smart with consent may fall back to cloud", () => {
    const p = planRoute({ mode: "smart", consented: true, deviceAvailable: false, online: true });
    assert.equal(p.sdkMode, "PREFER_ON_DEVICE");
    assert.equal(p.allowed, true);
  });
});

test("on-device token budget is conservative and never silent", async (t) => {
  await t.test("short notice fits local budget", () => {
    assert.equal(fitsLocalBudget("Application deadline: December 15, 2026."), true);
  });
  await t.test("very long document does not fit local budget", () => {
    assert.equal(fitsLocalBudget("x".repeat(200_000)), false);
  });
  await t.test("budget stays under the documented 9,216 limit", () => {
    assert.ok(LOCAL_MAX_TOKENS <= 9216);
    assert.ok(estimateTokens("x".repeat(40_000)) > 9000);
  });
});

test("SDK mode name mapping is exhaustive", () => {
  assert.equal(sdkModeToInferenceModeName("ONLY_ON_DEVICE"), "only_on_device");
  assert.equal(sdkModeToInferenceModeName("PREFER_ON_DEVICE"), "prefer_on_device");
  assert.equal(sdkModeToInferenceModeName("ONLY_IN_CLOUD"), "only_in_cloud");
  assert.equal(sdkModeToInferenceModeName("PREFER_IN_CLOUD"), "prefer_in_cloud");
});