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
import { selectRelevantContext, selectRelevantContextFromDocuments } from "../lib/retrieval/chunker.ts";
import { FOLLOWUP_SYSTEM, FOLLOWUP_USER } from "../../frontend/src/lib/prompts.ts";

const router = Router();
router.use(noCache);
router.post("/ask", async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { sourceText, result, question, language, lang, history = [], documents } = req.body || {};
    const useLang = language || lang || "en";
    const docContext = typeof sourceText === "string" ? sourceText : (typeof result?.originalText === "string" ? result.originalText : "");
    if (!question || typeof question !== "string") {
      return res.status(400).json({ ok: false, error: "question required.", retryable: false, code: "INVALID_INPUT" });
    }
    if (typeof docContext !== "string" || !docContext) {
      return res.status(400).json({ ok: false, error: "sourceText required.", retryable: false, code: "INVALID_INPUT" });
    }
    const safeContext = sanitizeText(docContext).slice(0, LIMITS.maxTextLength);
    const safeQuestion = sanitizeText(question).slice(0, 1000);
    const boundedHistory = (Array.isArray(history) ? history : []).slice(-LIMITS.maxHistoryMessages);

    if (detectInjection(safeQuestion)) {
      log("warn", "injection in ask", { requestId });
    }

    if (!llm) {
      inc("llm_failures");
      return res.status(503).json({ ok: false, error: "Live answers are unavailable right now.", retryable: false, code: "NOT_CONFIGURED" });
    }

    const system = FOLLOWUP_SYSTEM;
    const histStr = boundedHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    // For a long document only the parts that mention the question are sent
    // to the model. The answer still has to come from the document, but the
    // document no longer has to fit in one prompt. With several documents
    // open, the best chunks of each are sent together.
    const named = Array.isArray(documents)
      ? documents
          .filter((d: any) => d && typeof d.text === "string" && d.text.trim())
          .map((d: any) => ({ title: String(d.title ?? "Document").slice(0, 120), text: sanitizeText(d.text).slice(0, LIMITS.maxTextLength) }))
      : [];
    const relevant = named.length
      ? selectRelevantContextFromDocuments(safeQuestion, named)
      : selectRelevantContext(safeQuestion, safeContext);
    const user = FOLLOWUP_USER({
      docContext: wrapUntrustedDocument(relevant.context),
      history: histStr,
      question: safeQuestion,
      lang: useLang,
    });

    try {
      const answer = await withTimeout(
        retry(async () => llm!.complete(system, user, 500), 2, 300),
        LIMITS.followupTimeoutMs
      );
      addSpend(0.001);
      inc("followup_success");
      const trimmed = unwrapUntrustedDocument(answer);
      // The answer must come from the document. Detect the model's own refusal
      // so the UI can say so plainly instead of showing a vague answer.
      const notFound = /not (?:in|stated in|mentioned in|specified in|found in) (?:your |the )?document/i.test(
        trimmed
      ) || /does not (?:say|state|mention|contain|specify)\b/i.test(trimmed) || /isn't in your document/i.test(trimmed);
      return res.json({
        ok: true,
        data: { answer: trimmed || "I couldn't generate an answer. Please ask the issuer directly.", sourceQuote: null, notFound },
        meta: { requestId, processingMs: Date.now() - start, version: "1.0" },
      });
    } catch (e) {
      log("error", "ask upstream failed", { requestId, err: String(e) });
      inc("llm_failures");
      return res.status(502).json({ ok: false, error: "I could not answer that right now. Please try again.", retryable: true, code: "UPSTREAM" });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;