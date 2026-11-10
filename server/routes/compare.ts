import { Router } from "express";
import { llm } from "../context.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { sanitizeText } from "../lib/security/input-guard.ts";
import { wrapUntrustedDocument, unwrapUntrustedDocument } from "../lib/security/content-isolation.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { retry } from "../lib/utils/retry.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { addSpend } from "../lib/security/spend-guard.ts";
import { COMPARE_SYSTEM, COMPARE_USER } from "../../frontend/src/lib/prompts.ts";

const router = Router();
router.use(noCache);

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

router.post("/compare", async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { textA, textB, docA, docB, lang = "en" } = req.body || {};
    const a = typeof textA === "string" ? textA : typeof docA?.originalText === "string" ? docA.originalText : "";
    const b = typeof textB === "string" ? textB : typeof docB?.originalText === "string" ? docB.originalText : "";
    if (!a.trim() || !b.trim()) {
      return res.status(400).json({ ok: false, error: "Two documents are needed to compare.", retryable: false, code: "INVALID_INPUT" });
    }

    const safeA = sanitizeText(a).slice(0, LIMITS.maxTextLength);
    const safeB = sanitizeText(b).slice(0, LIMITS.maxTextLength);

    if (!llm) {
      inc("llm_failures");
      return res.status(503).json({ ok: false, error: "Document comparison is unavailable right now.", retryable: false, code: "NOT_CONFIGURED" });
    }

    const user = COMPARE_USER({
      docA: wrapUntrustedDocument(safeA),
      docB: wrapUntrustedDocument(safeB),
      lang,
    });

    let raw: any;
    try {
      const content = await withTimeout(
        retry(async () => llm!.complete(COMPARE_SYSTEM, user, 900), 2, 300),
        LIMITS.followupTimeoutMs
      );
      raw = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    } catch (err) {
      log("error", "compare upstream failed", { requestId, err: String(err) });
      inc("llm_failures");
      return res.status(502).json({ ok: false, error: "We could not compare those documents right now. Please try again in a moment.", retryable: true, code: "UPSTREAM" });
    }
    addSpend(0.001);

    return res.json({
      ok: true,
      data: {
        summary:
          unwrapUntrustedDocument(String(raw?.summary ?? "").trim()) ||
          "The two documents differ in the points listed below.",
        onlyInA: toList(raw?.onlyInA ?? raw?.only_in_a).map(unwrapUntrustedDocument),
        onlyInB: toList(raw?.onlyInB ?? raw?.only_in_b).map(unwrapUntrustedDocument),
        differences: toList(raw?.differences).map(unwrapUntrustedDocument),
        lang,
      },
      meta: { requestId, processingMs: Date.now() - start, version: "1.0" },
    });
  } catch (err) {
    log("error", "compare error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
