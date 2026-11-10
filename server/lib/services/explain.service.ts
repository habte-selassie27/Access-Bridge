import { llm } from "../../context.ts";
import { LIMITS } from "../config/limits.ts";
import { inc } from "../observability/metrics.ts";
import { log } from "../observability/logger.ts";
import { withTimeout } from "../utils/timeout.ts";
import { retry } from "../utils/retry.ts";
import { wrapUntrustedDocument } from "../security/content-isolation.ts";
import { runVerification } from "../../../frontend/src/lib/verify.ts";
import { EXPLAIN_SYSTEM, EXPLAIN_USER, LEVELS } from "../../../frontend/src/lib/prompts.ts";
import { ExplainResponseSchema } from "../../../frontend/src/lib/schema.ts";
import { examplesForLanguage, formatExampleBlock } from "./adaption.service.ts";
import { toFrontendResult, normalizeModelOutput } from "../transform.ts";
import { isEthiopianDate } from "../verify/calendar/ethiopian.ts";
import { ethiopianToGregorianApprox } from "../verify/calendar/conversion.ts";

export interface ExplainOutcome {
  status: number;
  body: Record<string, unknown>;
}

export function normalizeLevel(value: unknown): "simple" | "standard" | "detailed" {
  const level = String(value ?? "").toLowerCase();
  return (LEVELS as readonly string[]).includes(level) ? (level as "simple" | "standard" | "detailed") : "standard";
}

/**
 * The explanation pipeline.
 *
 * The model only proposes. Every date and amount is re-found in the source
 * text by the deterministic verifier before it is allowed to carry a
 * "verified" badge, whatever the model claimed.
 */
export async function runExplain(opts: {
  sourceText: string;
  lang: string;
  level?: unknown;
  requestId: string;
}): Promise<ExplainOutcome> {
  const { sourceText, lang } = opts;
  const level = normalizeLevel(opts.level);
  const start = Date.now();

  if (!llm) {
    inc("llm_failures");
    log("warn", "explain rejected: no llm configured", { requestId: opts.requestId });
    return {
      status: 503,
      body: {
        ok: false,
        error: "Live explanations are not available right now. Try one of the demo examples instead.",
        retryable: false,
        code: "NOT_CONFIGURED",
      },
    };
  }

  const ethNote = isEthiopianDate(sourceText)
    ? " (Ethiopian calendar detected; conversions are approximate)"
    : "";

  const system = EXPLAIN_SYSTEM;
  const fewShotExamples = examplesForLanguage(lang, 3);
  const user =
    EXPLAIN_USER({
      text: wrapUntrustedDocument(sourceText),
      lang,
      level,
      exampleBlock: formatExampleBlock(fewShotExamples),
    }) + ethNote;

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
      const retryUser =
        user +
        "\n\nPrevious output invalid. Errors: " +
        JSON.stringify(validation.error.flatten()) +
        "\nReturn JSON only.";
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
    // Never substitute another document's explanation: a failed call is an
    // error, not a result.
    log("error", "explain upstream failed", { requestId: opts.requestId, err: String(err) });
    inc("llm_failures");
    return {
      status: 502,
      body: {
        ok: false,
        error: "We could not read this document right now. Please try again in a moment.",
        retryable: true,
        code: "UPSTREAM",
      },
    };
  }

  const { verifiedDeadlines, verifiedCosts, warnings } = runVerification(
    parsed.deadlines.map((d: any) => ({ label: d.label, date: d.date })),
    parsed.costs.map((c: any) => ({ label: c.label, amount: c.amount, currency: c.currency })),
    sourceText
  );
  parsed.deadlines = parsed.deadlines.map((d: any, i: number) => ({
    ...d,
    verified: verifiedDeadlines[i]?.verified ?? false,
    matchedSource: verifiedDeadlines[i]?.matchedSource ?? null,
  }));
  parsed.costs = parsed.costs.map((c: any, i: number) => ({
    ...c,
    verified: verifiedCosts[i]?.verified ?? false,
    matchedSource: verifiedCosts[i]?.matchedSource ?? null,
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
  parsed.level = level;

  const transformed = toFrontendResult(parsed, sourceText);
  inc("explain_success");
  log("info", "explain ok", {
    requestId: opts.requestId,
    lang,
    level,
    ms: Date.now() - start,
    verified: verifiedDeadlines.filter((d) => d.verified).length,
  });
  return {
    status: 200,
    body: {
      ok: true,
      data: transformed,
      meta: { requestId: opts.requestId, processingMs: Date.now() - start, version: "1.0", level },
    },
  };
}
