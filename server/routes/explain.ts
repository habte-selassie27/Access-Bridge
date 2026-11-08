import { Router } from "express";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
import { llm, ocr, DEMO_INDEX } from "../context.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { ENV } from "../lib/config/env.ts";
import { checkRateLimit } from "../lib/security/rate-limit.ts";
import { canSpend, addSpend } from "../lib/security/spend-guard.ts";
import { sanitizeText, detectInjection } from "../lib/security/input-guard.ts";
import { isAllowedMime } from "../lib/security/file-validator.ts";
import { wrapUntrustedDocument } from "../lib/security/content-isolation.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { retry } from "../lib/utils/retry.ts";
import { runVerification } from "../../frontend/src/lib/verify.ts";
import { EXPLAIN_SYSTEM, EXPLAIN_USER } from "../../frontend/src/lib/prompts.ts";
import { ExplainResponseSchema } from "../../frontend/src/lib/schema.ts";
import { toFrontendResult, normalizeModelOutput } from "../lib/transform.ts";
import { isEthiopianDate } from "../lib/verify/calendar/ethiopian.ts";
import { ethiopianToGregorianApprox } from "../lib/verify/calendar/conversion.ts";

const router = Router();

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

router.post("/explain", upload.single("file"), async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { text, file, mime, lang = "en", demoId } = req.body || {};
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

    // No model configured: fail honestly. Demo documents are served above and never reach here.
    if (!llm) {
      inc("llm_failures");
      log("warn", "explain rejected: no llm configured", { requestId });
      return res.status(503).json({
        ok: false,
        error: "Live explanations are not available right now. Try one of the demo examples instead.",
        retryable: false,
        code: "NOT_CONFIGURED",
      });
    }

    const ethNote = isEthiopianDate(sourceText) ? " (Ethiopian calendar detected; conversions are approximate)" : "";

    const system = EXPLAIN_SYSTEM;
    const user = EXPLAIN_USER({ text: wrapUntrustedDocument(sourceText), lang }) + ethNote;

    let parsed: any;
    try {
      const contentText = await withTimeout(
        retry(async () => llm!.complete(system, user, 1200), 2, 400),
        LIMITS.explainTimeoutMs
      );
      try {
        const rawParsed = JSON.parse(contentText.replace(/```json\n?|\n?```/g, "").trim());
        parsed = normalizeModelOutput(rawParsed, sourceText, lang);
      } catch {
        const retryUser = user + "\n\nPrevious output was invalid JSON. Return JSON only matching schema.";
        const retryText = await withTimeout(llm!.complete(system, retryUser, 1200), LIMITS.explainTimeoutMs);
        const rawParsed2 = JSON.parse(retryText.replace(/```json\n?|\n?```/g, "").trim());
        parsed = normalizeModelOutput(rawParsed2, sourceText, lang);
      }
      const validation = ExplainResponseSchema.safeParse(parsed);
      if (!validation.success) {
        const retryUser = user + "\n\nPrevious output invalid. Errors: " + JSON.stringify(validation.error.flatten()) + "\nReturn JSON only.";
        const retryText = await withTimeout(llm!.complete(system, retryUser, 1200), LIMITS.explainTimeoutMs);
        const rawParsed3 = JSON.parse(retryText.replace(/```json\n?|\n?```/g, "").trim());
        parsed = normalizeModelOutput(rawParsed3, sourceText, lang);
        const v2 = ExplainResponseSchema.safeParse(parsed);
        if (!v2.success) {
          throw new Error("schema_invalid");
        }
        parsed = v2.data;
      } else {
        parsed = validation.data;
      }
    } catch (err) {
      // Never substitute another document's explanation: a failed call is an error, not a result.
      log("error", "explain upstream failed", { requestId, err: String(err) });
      inc("llm_failures");
      return res.status(502).json({
        ok: false,
        error: "We could not read this document right now. Please try again in a moment.",
        retryable: true,
        code: "UPSTREAM",
      });
    }

    const { verifiedDeadlines, verifiedCosts, warnings } = runVerification(
      parsed.deadlines.map((d: any) => ({ label: d.label, date: d.date })),
      parsed.costs.map((c: any) => ({ label: c.label, amount: c.amount, currency: c.currency })),
      sourceText
    );
    parsed.deadlines = parsed.deadlines.map((d: any, i: number) => ({
      ...d,
      verified: verifiedDeadlines[i]?.verified ?? false,
    }));
    parsed.costs = parsed.costs.map((c: any, i: number) => ({
      ...c,
      verified: verifiedCosts[i]?.verified ?? false,
    }));

    const ethConversions: string[] = [];
    for (const d of parsed.deadlines) {
      if (d.date && isEthiopianDate(sourceText)) {
        const conv = ethiopianToGregorianApprox(String(d.date));
        if (conv) {
          ethConversions.push(`${conv.ethiopian} ≈ ${conv.gregorian} (approximate, check original)`);
        }
      }
    }

    parsed.warnings = [...(parsed.warnings || []), ...warnings, ...ethConversions];
    parsed.lang = lang;
    parsed.originalText = sourceText;
    parsed.confidence = parsed.confidence || "medium";

    const transformed = toFrontendResult(parsed, sourceText);
    addSpend(0.002);
    inc("explain_success");
    log("info", "explain ok", { requestId, lang, ms: Date.now() - start, verified: verifiedDeadlines.filter((d) => d.verified).length });
    return res.json({ ok: true, data: transformed, meta: { requestId, processingMs: Date.now() - start, version: "1.0" } });
  } catch (err) {
    log("error", "explain error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});
export default router;
