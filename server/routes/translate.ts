import { Router } from "express";
import { llm } from "../context.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { sanitizeText } from "../lib/security/input-guard.ts";
import { wrapUntrustedContent, unwrapUntrustedDocument } from "../lib/security/content-isolation.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { retry } from "../lib/utils/retry.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { addSpend, canSpend } from "../lib/security/spend-guard.ts";
import { checkRateLimit } from "../lib/security/rate-limit.ts";
import { ENV } from "../lib/config/env.ts";
import { TRANSLATE_SYSTEM, TRANSLATE_USER } from "../../frontend/src/lib/prompts.ts";

const router = Router();
router.use(noCache);

const MAX_CHARS = 8000;

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

router.post("/translate", async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { text, lang = "en", sourceLanguage = "en" } = req.body || {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ ok: false, error: "text required.", retryable: false, code: "INVALID_INPUT" });
    }
    const safeText = sanitizeText(text).slice(0, MAX_CHARS);

    if (ENV.rateLimitEnabled && !checkRateLimit(clientIp(req))) {
      inc("rate_limit_rejections");
      return res.status(429).json({ ok: false, error: "Too many requests.", retryable: true, code: "RATE_LIMITED" });
    }

    if (!canSpend(ENV.dailySpendCapUsd)) {
      inc("spend_cap_hits");
      return res.status(429).json({ ok: false, error: "The demo has reached its daily usage limit. The saved documents still work.", retryable: false, code: "SPEND_CAP" });
    }

    if (!llm) {
      inc("llm_failures");
      return res.status(503).json({ ok: false, error: "Translation is unavailable right now.", retryable: false, code: "NOT_CONFIGURED" });
    }

    const user = TRANSLATE_USER({ text: wrapUntrustedContent(safeText), lang });

    let raw: any;
    try {
      const content = await withTimeout(
        retry(async () => llm!.complete(TRANSLATE_SYSTEM, user, 1400), 2, 300),
        LIMITS.explainTimeoutMs
      );
      raw = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    } catch (err) {
      log("error", "translate upstream failed", { requestId, err: String(err) });
      inc("llm_failures");
      return res.status(502).json({ ok: false, error: "We could not translate that right now. Please try again in a moment.", retryable: true, code: "UPSTREAM" });
    }
    addSpend(0.001);

    const translated = unwrapUntrustedDocument(String(raw?.translated ?? raw?.text ?? "").trim());
    if (!translated) {
      return res.status(502).json({ ok: false, error: "We could not translate that right now. Please try again in a moment.", retryable: true, code: "UPSTREAM" });
    }

    return res.json({
      ok: true,
      data: { original: safeText, translated, lang, sourceLanguage },
      meta: { requestId, processingMs: Date.now() - start, version: "1.0" },
    });
  } catch (err) {
    log("error", "translate error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
