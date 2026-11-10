import { test } from "node:test";
import assert from "node:assert/strict";

const { ttsConfig, ttsAvailable } = await import("../../server/lib/providers/tts/tts.adapter.ts");

const KEYS = [
  "TTS_PROVIDER",
  "TTS_PROVIDER_KEY",
  "TTS_API_KEY",
  "TTS_BASE_URL",
  "TTS_MODEL",
  "TTS_VOICE_ID",
] as const;

function clean(): void {
  for (const key of KEYS) delete process.env[key];
}

test("text-to-speech configuration", async (t) => {
  t.after(clean);

  await t.test("no configuration means the browser voice is used", () => {
    clean();
    assert.equal(ttsConfig().provider, "none");
    assert.equal(ttsAvailable(), false);
  });

  await t.test("a local endpoint needs no key", () => {
    clean();
    process.env.TTS_BASE_URL = "http://127.0.0.1:8880/v1";
    assert.equal(ttsConfig().provider, "local");
    assert.equal(ttsConfig().baseUrl, "http://127.0.0.1:8880/v1");
    assert.equal(ttsAvailable(), true);
  });

  await t.test("TTS_PROVIDER=local falls back to the localhost endpoint", () => {
    clean();
    process.env.TTS_PROVIDER = "local";
    assert.equal(ttsConfig().provider, "local");
    assert.equal(ttsConfig().baseUrl, "http://127.0.0.1:8880/v1");
    assert.equal(ttsAvailable(), true);
  });

  await t.test("a hosted provider without a key is unavailable", () => {
    clean();
    process.env.TTS_PROVIDER = "openai";
    assert.equal(ttsAvailable(), false);
  });

  await t.test("a hosted provider with a key is available", () => {
    clean();
    process.env.TTS_PROVIDER = "openai";
    process.env.TTS_PROVIDER_KEY = "test-key";
    assert.equal(ttsAvailable(), true);
  });

  await t.test("TTS_API_KEY is accepted as the legacy key name", () => {
    clean();
    process.env.TTS_PROVIDER = "elevenlabs";
    process.env.TTS_API_KEY = "test-key";
    assert.equal(ttsAvailable(), true);
  });

  await t.test("an unknown provider is not silently remapped to another vendor", () => {
    clean();
    process.env.TTS_PROVIDER = "not-a-provider";
    process.env.TTS_PROVIDER_KEY = "test-key";
    assert.equal(ttsConfig().provider, "none");
    assert.equal(ttsAvailable(), false);
  });
});
