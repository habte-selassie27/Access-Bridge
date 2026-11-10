import { Router } from "express";
import { inc } from "../lib/observability/metrics.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";
import { synthesizeSpeech, ttsAvailable, ttsConfig } from "../lib/providers/tts/tts.adapter.ts";

const router = Router();
router.use(noCache);

/**
 * Text to speech.
 *
 * With a provider key configured this returns real audio bytes, so a phone
 * without an Amharic or Arabic voice still hears the explanation. Without
 * one it says so, and the client falls back to the browser's own voice.
 */
router.post("/tts", async (req, res) => {
  const requestId = newRequestId();
  try {
    const { text, lang = "en" } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text required.", retryable: false, code: "INVALID_INPUT" });
    }
    inc("tts_requests");

    if (!ttsAvailable()) {
      return res.json({
        ok: true,
        fallback: "webspeech",
        supported: false,
        provider: "none",
        meta: { requestId, version: "1.0" },
      });
    }

    const speech = await synthesizeSpeech(text, lang);
    if (!speech) {
      log("warn", "tts provider returned no audio", { requestId, provider: ttsConfig().provider });
      return res.json({
        ok: true,
        fallback: "webspeech",
        supported: false,
        provider: ttsConfig().provider,
        meta: { requestId, version: "1.0" },
      });
    }

    return res
      .status(200)
      .set("Content-Type", speech.mimeType)
      .set("X-Accel-Buffering", "no")
      .set("X-TTS-Provider", ttsConfig().provider)
      .set("X-Request-Id", requestId)
      .send(speech.audio);
  } catch (err) {
    log("error", "tts error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
