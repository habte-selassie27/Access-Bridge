import { Router } from "express";
import { llm } from "../context.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { sanitizeText, detectInjection } from "../lib/security/input-guard.ts";
import { wrapUntrustedDocument, unwrapUntrustedDocument } from "../lib/security/content-isolation.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { retry } from "../lib/utils/retry.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";
import { inc } from "../lib/observability/metrics.ts";
import { addSpend, canSpend } from "../lib/security/spend-guard.ts";
import { checkRateLimit } from "../lib/security/rate-limit.ts";
import { ENV } from "../lib/config/env.ts";
import { ELIGIBILITY_SYSTEM, ELIGIBILITY_USER } from "../../frontend/src/lib/prompts.ts";
import { quoteIsTraceable, findQuoteSpan } from "../lib/verify/quote-verifier.ts";

const router = Router();
router.use(noCache);

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

const DISCLAIMER =
  "This is an assessment against the requirements published in the document. It is not a decision, and it is not a promise of acceptance. Check with the issuing organisation.";

function normalizeStatus(value: unknown): "met" | "not_met" | "unknown" {
  const s = String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "met" || s === "yes" || s === "satisfied" || s === "pass") return "met";
  if (s === "not_met" || s === "no" || s === "not_satisfied" || s === "fail") return "not_met";
  return "unknown";
}

router.post("/eligibility", async (req, res) => {
  const requestId = newRequestId();
  const start = Date.now();
  try {
    const { sourceText, result, profile, lang = "en" } = req.body || {};
    const docContext =
      typeof sourceText === "string" && sourceText
        ? sourceText
        : typeof result?.originalText === "string"
          ? result.originalText
          : "";
    if (!docContext) {
      return res.status(400).json({ ok: false, error: "The document text is required to check eligibility.", retryable: false, code: "INVALID_INPUT" });
    }
    if (typeof profile !== "string" || !profile.trim()) {
      return res.status(400).json({ ok: false, error: "Tell us a little about yourself so we can compare it to the requirements.", retryable: false, code: "INVALID_INPUT" });
    }

    const safeDoc = sanitizeText(docContext).slice(0, LIMITS.maxTextLength);
    const safeProfile = sanitizeText(profile).slice(0, 2000);
    if (detectInjection(safeProfile)) {
      log("warn", "injection in eligibility profile", { requestId });
    }

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
      return res.status(503).json({ ok: false, error: "The eligibility check is unavailable right now.", retryable: false, code: "NOT_CONFIGURED" });
    }

    const user = ELIGIBILITY_USER({
      docContext: wrapUntrustedDocument(safeDoc),
      profile: safeProfile,
      lang,
    });

    let raw: any;
    try {
      const content = await withTimeout(
        retry(async () => llm!.complete(ELIGIBILITY_SYSTEM, user, 900), 2, 300),
        LIMITS.followupTimeoutMs
      );
      raw = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    } catch (err) {
      log("error", "eligibility upstream failed", { requestId, err: String(err) });
      inc("llm_failures");
      return res.status(502).json({ ok: false, error: "We could not run the check right now. Please try again in a moment.", retryable: true, code: "UPSTREAM" });
    }
    addSpend(0.001);

    const modelItems = Array.isArray(raw?.items) ? raw.items : [];
    const items = modelItems.slice(0, 20).map((it: any) => {
      const criterion = String(it?.criterion ?? "").trim();
      const quote = String(it?.quote ?? "").trim();
      const reason = String(it?.reason ?? "").trim();
      if (!criterion) return null;

      // The model's verdict is only kept when the quote it gave can be found in
      // the document. An untraceable quote means we cannot show the reader
      // where the requirement comes from, so the verdict is downgraded.
      const traceable = quote ? quoteIsTraceable(quote, safeDoc) : false;
      const status = traceable ? normalizeStatus(it?.status) : "unknown";
      const span = traceable ? findQuoteSpan(quote, safeDoc) : null;

      return {
        criterion: unwrapUntrustedDocument(criterion),
        status,
        quote: traceable ? unwrapUntrustedDocument(quote) : null,
        sourceSpan: span,
        reason: traceable
          ? unwrapUntrustedDocument(reason)
          : "The document text for this requirement could not be located, so it was not checked.",
        warning: traceable
          ? null
          : quote
            ? "We could not find this wording in the original document, so the answer was not accepted."
            : "No source quote was given for this requirement, so it was not checked.",
      };
    }).filter(Boolean);

    const met = items.filter((i: any) => i.status === "met").length;
    const notMet = items.filter((i: any) => i.status === "not_met").length;
    const unknown = items.filter((i: any) => i.status === "unknown").length;

    const summary =
      typeof raw?.summary === "string" && raw.summary.trim()
        ? unwrapUntrustedDocument(raw.summary)
        : items.length === 0
          ? "This document does not publish eligibility requirements we could check."
          : `Of the ${items.length} published requirements, ${met} look met, ${notMet} look not met, and ${unknown} could not be checked.`;

    return res.json({
      ok: true,
      data: { items, summary, disclaimer: DISCLAIMER, lang },
      meta: { requestId, processingMs: Date.now() - start, version: "1.0" },
    });
  } catch (err) {
    log("error", "eligibility error", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
