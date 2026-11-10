import { test } from "node:test";
import assert from "node:assert/strict";

// The accessibility store writes to the DOM and to localStorage, so both are
// stubbed before the module is imported.
const dataset: Record<string, string> = {};
const store = new Map<string, string>();

(globalThis as any).document = {
  documentElement: {
    dataset,
    set style(_v: unknown) {},
    get style() {
      return {};
    },
  },
};
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { DEFAULT_A11Y, applyA11y, setA11y, resetA11y, getA11y, initA11y } = await import(
  "../../frontend/src/lib/a11y.ts"
);

test("accessibility preferences", async (t) => {
  await t.test("defaults are the dark theme at normal text size", () => {
    const settings = getA11y();
    assert.equal(settings.theme, DEFAULT_A11Y.theme);
    assert.equal(settings.fontScale, "md");
    assert.equal(settings.contrast, "normal");
  });

  await t.test("settings are applied to the document element", () => {
    setA11y({ theme: "light", fontScale: "xl", contrast: "high", spacing: "relaxed", simpleMode: true });
    assert.equal(dataset.theme, "light");
    assert.equal(dataset.fontScale, "xl");
    assert.equal(dataset.contrast, "high");
    assert.equal(dataset.spacing, "relaxed");
    assert.equal(dataset.simpleMode, "on");
  });

  await t.test("settings are stored so they survive a reload", () => {
    setA11y({ fontScale: "lg" });
    assert.match(store.get("pastewise-a11y") ?? "", /"fontScale":"lg"/);
  });

  await t.test("a stored setting is restored on the next visit", () => {
    store.set("pastewise-a11y", JSON.stringify({ theme: "light", fontScale: "lg", contrast: "high" }));
    const restored = initA11y();
    assert.equal(restored.theme, "light");
    assert.equal(restored.fontScale, "lg");
    assert.equal(restored.contrast, "high");
    assert.equal(dataset.theme, "light");
  });

  await t.test("a corrupt stored value falls back to the defaults", () => {
    store.set("pastewise-a11y", "{not json");
    const restored = initA11y();
    assert.equal(restored.theme, DEFAULT_A11Y.theme);
    assert.equal(restored.fontScale, "md");
  });

  await t.test("reset clears everything", () => {
    setA11y({ theme: "light" });
    resetA11y();
    assert.equal(getA11y().theme, "dark");
    assert.equal(dataset.theme, "dark");
    assert.equal(store.get("pastewise-a11y"), undefined);
  });
});
