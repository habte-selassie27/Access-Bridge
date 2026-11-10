import { Router } from "express";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
import { ocr, DEMO_INDEX } from "../context.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { ENV } from "../lib/config/env.ts";
import { checkRateLimit } from "../lib/security/rate-limit.ts";
import { canSpend, addSpend } from "../lib/security/spend-guard.ts";
import { sanitizeText, detectInjection } from "../lib/security/input-guard.ts";
import { isAllowedMime } from "../lib/security/file-validator.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { noCache } from "../middleware/request-logger.ts";
import { toFrontendResult } from "../lib/transform.ts";
import { runExplain } from "../lib/services/explain.service.ts";

const router = Router();
router.use(noCache);

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

router.post("/explain", upload.single("file"), async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { text, file, mime, lang = "en", demoId, level } = req.body || {};
    let uploadedFile: string | undefined = file;
    let uploadedMime: string | undefined = mime;
    if (req.file) {
      uploadedFile = req.file.buffer.toString("base64");
      uploadedMime = req.file.mimetype;
    }

    if (ENV.rateLimitEnabled && !checkRateLimit(clientIp(req))) {
      inc("rate_limit_rejections");
      return res.status(429).json({ ok: false, error: "Too many requests.", retryable: true, code: "RATE_LIMITED" });
    }

    // Demo request: pick the cached output for the requested language.
    if (demoId) {
      const baseId = String(demoId).split(":")[0];
      const demo = DEMO_INDEX[`${baseId}:${lang}`] || DEMO_INDEX[`${baseId}:en`];
      if (!demo) {
        return res.status(404).json({ ok: false, error: "That example is not available.", retryable: false, code: "INVALID_INPUT" });
      }
      inc("demo_requests");
      log("info", "explain demo", { requestId, demoId: baseId, lang, ms: Date.now() - start });
      const transformed = toFrontendResult(demo, demo.originalText || "");
      return res.json({ ok: true, data: transformed, meta: { requestId, processingMs: Date.now() - start, version: "1.0" } });
    }

    if (!canSpend(ENV.dailySpendCapUsd)) {
      inc("spend_cap_hits");
      return res.status(429).json({ ok: false, error: "The demo has reached its daily usage limit for live explanations. Demo examples still work.", retryable: false, code: "SPEND_CAP" });
    }

    let sourceText = "";
    if (text) {
      if (typeof text !== "string") {
        return res.status(400).json({ ok: false, error: "text must be a string.", retryable: false, code: "INVALID_INPUT" });
      }
      if (text.length > LIMITS.maxTextLength) {
        return res.status(413).json({ ok: false, error: `Text exceeds ${LIMITS.maxTextLength} chars.`, retryable: false, code: "INVALID_INPUT" });
      }
      sourceText = sanitizeText(text);
      if (detectInjection(sourceText)) {
        log("warn", "prompt injection detected", { requestId });
      }
    }

    if (uploadedFile) {
      if (!uploadedMime || !isAllowedMime(uploadedMime)) {
        return res.status(415).json({ ok: false, error: "Unsupported file type.", retryable: false, code: "UNSUPPORTED_MIME" });
      }
      const sizeBytes = Math.ceil((uploadedFile!.length * 3) / 4);
      if (sizeBytes > LIMITS.maxFileSizeBytes) {
        return res.status(413).json({ ok: false, error: "File too large.", retryable: false, code: "FILE_TOO_LARGE" });
      }
      if (!ocr) {
        return res.status(503).json({ ok: false, error: "OCR unavailable; paste text instead.", retryable: false, code: "UPSTREAM" });
      }
      try {
        const extracted = await withTimeout(ocr.extractText(uploadedFile!, uploadedMime!) as Promise<string>, LIMITS.explainTimeoutMs);
        sourceText = sourceText ? `${sourceText}\n${extracted}` : extracted;
      } catch (e) {
        log("error", "ocr failed", { requestId, err: String(e) });
        inc("ocr_failures");
        return res.status(502).json({ ok: false, error: "Could not read the file. Try a clearer image or paste text.", retryable: true, code: "UPSTREAM" });
      }
    }

    if (!sourceText) {
      return res.status(400).json({ ok: false, error: "No text or file provided.", retryable: false, code: "INVALID_INPUT" });
    }

    const outcome = await runExplain({ sourceText, lang, level, requestId });
    if (outcome.status === 200) addSpend(0.002);
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    log("error", "explain error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
