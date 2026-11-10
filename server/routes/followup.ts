import { Router } from "express";
import { llm } from "../context.ts";
import { sanitizeText, detectInjection } from "../lib/security/input-guard.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { retry } from "../lib/utils/retry.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { addSpend } from "../lib/security/spend-guard.ts";
import { wrapUntrustedDocument, unwrapUntrustedDocument } from "../lib/security/content-isolation.ts";
import { FOLLOWUP_SYSTEM, FOLLOWUP_USER } from "../../frontend/src/lib/prompts.ts";

const router = Router();
router.use(noCache);
router.post("/followup", async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { docContext, history = [], question, lang = "en" } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ ok: false, error: "question required.", retryable: false, code: "INVALID_INPUT" });
    }
    if (typeof docContext !== "string") {
      return res.status(400).json({ ok: false, error: "docContext required.", retryable: false, code: "INVALID_INPUT" });
    }
    const safeContext = sanitizeText(docContext).slice(0, LIMITS.maxTextLength);
    const safeQuestion = sanitizeText(question).slice(0, 1000);
    const boundedHistory = (Array.isArray(history) ? history : []).slice(-LIMITS.maxHistoryMessages);

    if (detectInjection(safeQuestion)) {
      log("warn", "injection in followup", { requestId });
    }

    // No model configured: report it instead of sending a canned string as an answer.
    if (!llm) {
      inc("llm_failures");
      return res.status(503).json({ ok: false, error: "Live answers are unavailable right now.", retryable: false, code: "NOT_CONFIGURED" });
    }

    const system = FOLLOWUP_SYSTEM;
    const histStr = boundedHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const user = FOLLOWUP_USER({ docContext: wrapUntrustedDocument(safeContext), history: histStr, question: safeQuestion, lang });

    try {
      const answer = await withTimeout(
        retry(async () => llm!.complete(system, user, 500), 2, 300),
        LIMITS.followupTimeoutMs
      );
      addSpend(0.001);
      inc("followup_success");
      return res.json({ ok: true, data: { answer: unwrapUntrustedDocument(answer) || "I couldn't generate an answer. Please ask the issuer directly.", supported: true, sourceReferences: [], lang }, meta: { requestId, processingMs: Date.now() - start, version: "1.0" } });
    } catch (e) {
      log("error", "followup upstream failed", { requestId, err: String(e) });
      inc("llm_failures");
      return res.status(502).json({ ok: false, error: "I could not answer that right now. Please try again.", retryable: true, code: "UPSTREAM" });
    }
  } catch (err) {
    log("error", "followup error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});
export default router;
