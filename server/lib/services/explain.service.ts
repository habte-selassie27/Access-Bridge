import { llm } from "../../context.ts";
import { LIMITS } from "../config/limits.ts";
import { inc } from "../observability/metrics.ts";
import { log } from "../observability/logger.ts";
import { withTimeout } from "../utils/timeout.ts";
import { retry } from "../utils/retry.ts";
import { wrapUntrustedDocument } from "../security/content-isolation.ts";
import { addSpend } from "../security/spend-guard.ts";
import { runVerification } from "../../../frontend/src/lib/verify.ts";
import { EXPLAIN_SYSTEM, EXPLAIN_USER, LEVELS } from "../../../frontend/src/lib/prompts.ts";
import { ExplainResponseSchema } from "../../../frontend/src/lib/schema.ts";
import { examplesForLanguage, formatExampleBlock } from "./adaption.service.ts";
import { toFrontendResult, normalizeModelOutput } from "../transform.ts";
import { isEthiopianDate } from "../verify/calendar/ethiopian.ts";
import { ethiopianToGregorianApprox } from "../verify/calendar/conversion.ts";
import { chunkText } from "../retrieval/chunker.ts";
import { verifyGlossary, verifyContacts } from "../verify/content-verifier.ts";

export interface ExplainOutcome {
  status: number;
  body: Record<string, unknown>;
}

export function normalizeLevel(value: unknown): "simple" | "standard" | "detailed" {
  const level = String(value ?? "").toLowerCase();
  return (LEVELS as readonly string[]).includes(level) ? (level as "simple" | "standard" | "detailed") : "standard";
}

/** A document longer than this is read in chunks and merged. */
const CHUNK_THRESHOLD = 8000;
/** Never make more model calls than this for one document. */
const MAX_CHUNKS = 12;
/** Pause between chunk calls, so a long document does not trip the rate limit. */
const CHUNK_DELAY_MS = 2500;
/** How long to wait before trying a chunk that hit a rate limit. */
const CHUNK_RETRY_WAIT_MS = 15_000;

function parseModelOutput(contentText: string, sourceText: string, lang: string): any {
  const raw = JSON.parse(contentText.replace(/```json\n?|\n?```/g, "").trim());
  return normalizeModelOutput(raw, sourceText, lang);
}

/** One pass over one piece of a document. Returns the model's proposal. */
async function explainOnce(text: string, lang: string, level: string, exampleCount = 3): Promise<any> {
  const system = EXPLAIN_SYSTEM;
  const fewShotExamples = examplesForLanguage(lang, exampleCount);
  const user =
    EXPLAIN_USER({
      text: wrapUntrustedDocument(text),
      lang,
      level,
      exampleBlock: formatExampleBlock(fewShotExamples),
    }) + (isEthiopianDate(text) ? " (Ethiopian calendar detected; conversions are approximate)" : "");

  const contentText = await withTimeout(
    retry(async () => llm!.complete(system, user, 1200), 2, 400),
    LIMITS.explainTimeoutMs
  );
  let parsed: any;
  try {
    parsed = parseModelOutput(contentText, text, lang);
  } catch {
    const retryUser = user + "\n\nPrevious output was invalid JSON. Return JSON only matching schema.";
    const retryText = await withTimeout(llm!.complete(system, retryUser, 1200), LIMITS.explainTimeoutMs);
    parsed = parseModelOutput(retryText, text, lang);
  }

  const validation = ExplainResponseSchema.safeParse(parsed);
  if (validation.success) return validation.data;

  const retryUser =
    user +
    "\n\nPrevious output invalid. Errors: " +
    JSON.stringify(validation.error.flatten()) +
    "\nReturn JSON only.";
  const retryText = await withTimeout(llm!.complete(system, retryUser, 1200), LIMITS.explainTimeoutMs);
  const second = parseModelOutput(retryText, text, lang);
  const secondValidation = ExplainResponseSchema.safeParse(second);
  if (!secondValidation.success) throw new Error("schema_invalid");
  return secondValidation.data;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

function dedupeBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const value of values) {
    const k = key(value);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(value);
  }
  return out;
}

/**
 * Merge the per-chunk proposals into one answer.
 *
 * The facts are merged deterministically so nothing is lost and nothing is
 * invented. Only the summary is written by the model, from the merged facts.
 */
async function mergeChunkResults(
  parts: any[],
  sourceText: string,
  lang: string,
  level: string
): Promise<any> {
  const merged: any = {
    docType: parts[0]?.docType || "other",
    summary: parts[0]?.summary || "",
    actions: dedupeBy(
      parts.flatMap((p) => p.actions || []),
      (a: any) => `${a.step}`.toLowerCase()
    ),
    eligibility: dedupeStrings(parts.flatMap((p) => p.eligibility || [])),
    howToApply: dedupeStrings(parts.flatMap((p) => p.howToApply || [])),
    deadlines: dedupeBy(
      parts.flatMap((p) => p.deadlines || []),
      (d: any) => `${d.label}|${d.date}`
    ),
    costs: dedupeBy(
      parts.flatMap((p) => p.costs || []),
      (c: any) => `${c.label}|${c.amount}|${c.currency}`
    ),
    documentsToBring: dedupeStrings(parts.flatMap((p) => p.documentsToBring || [])),
    sections: dedupeBy(
      parts.flatMap((p) => p.sections || []),
      (s: any) => `${s.title}`.toLowerCase()
    ),
    glossary: dedupeBy(
      parts.flatMap((p) => p.glossary || []),
      (g: any) => `${g.term}`.toLowerCase()
    ),
    contacts: dedupeBy(
      parts.flatMap((p) => p.contacts || []),
      (c: any) => `${c.kind}|${c.value}`.toLowerCase()
    ),
    examples: dedupeStrings(parts.flatMap((p) => p.examples || [])),
    confidence: parts.some((p) => p.confidence === "low")
      ? "low"
      : parts.every((p) => p.confidence === "high")
        ? "high"
        : "medium",
    warnings: dedupeStrings(parts.flatMap((p) => p.warnings || [])),
    lang,
  };

  // A short summary of the whole document, written from the merged facts.
  try {
    const digest = [
      `Document summary per section: ${parts.map((p) => p.summary).filter(Boolean).join(" | ")}`,
      `Key requirements: ${merged.actions.slice(0, 12).map((a: any) => a.step).join("; ")}`,
      merged.deadlines.length ? `Deadlines: ${merged.deadlines.map((d: any) => `${d.label} ${d.date}`).join("; ")}` : "",
      merged.costs.length ? `Costs: ${merged.costs.map((c: any) => `${c.label} ${c.amount} ${c.currency}`).join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const summary = await withTimeout(
      retry(
        async () =>
          llm!.complete(
            EXPLAIN_SYSTEM,
            `Write one or two plain sentences saying what this whole document is, for a reader with low literacy, in ${lang}.\nUse only this material:\n"""\n${digest}\n"""\nReturn JSON only: {"summary": "..."}`,
            200
          ),
        2,
        300
      ),
      LIMITS.followupTimeoutMs
    );
    const parsed = JSON.parse(summary.replace(/```json\n?|\n?```/g, "").trim());
    if (typeof parsed?.summary === "string" && parsed.summary.trim()) {
      merged.summary = parsed.summary.trim();
    }
  } catch {
    // Keep the first chunk's summary. A merged document still beats no answer.
    log("warn", "merge summary failed, using first chunk summary", { level });
  }

  merged.originalText = sourceText;
  merged.level = level;
  return merged;
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

  let parsed: any;
  let modelCalls = 0;
  try {
    const chunks = chunkText(sourceText, { maxChars: CHUNK_THRESHOLD }).slice(0, MAX_CHUNKS);
    if (chunks.length <= 1) {
      parsed = await explainOnce(sourceText, lang, level);
      modelCalls = 1;
    } else {
      // Long document: read it piece by piece, then merge.
      const parts: any[] = [];
      let failed = 0;
      for (const chunk of chunks) {
        if (parts.length > 0) await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
        try {
          parts.push(await explainOnce(chunk.text, lang, level, 1));
          modelCalls++;
        } catch (err) {
          // A rate limit is worth waiting out: the rest of the document is
          // still worth reading.
          log("warn", "chunk explain failed, waiting and retrying", {
            requestId: opts.requestId,
            chunk: chunk.index,
            err: String(err).slice(0, 200),
          });
          await new Promise((r) => setTimeout(r, CHUNK_RETRY_WAIT_MS));
          try {
            parts.push(await explainOnce(chunk.text, lang, level, 1));
            modelCalls++;
          } catch (retryErr) {
            failed++;
            log("warn", "chunk explain failed twice", {
              requestId: opts.requestId,
              chunk: chunk.index,
              err: String(retryErr).slice(0, 200),
            });
          }
        }
      }
      if (parts.length === 0) throw new Error("all_chunks_failed");
      parsed = await mergeChunkResults(parts, sourceText, lang, level);
      modelCalls++;
      if (failed > 0) {
        // Say so rather than pretending the whole document was read.
        parsed.warnings = [
          ...(parsed.warnings || []),
          `${failed} part(s) of this document could not be read, so some details may be missing. Check the original for anything important.`,
        ];
      }
      log("info", "explained long document in chunks", {
        requestId: opts.requestId,
        chunks: chunks.length,
        merged: parts.length,
        failed,
      });
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
    (parsed.deadlines || []).map((d: any) => ({ label: d.label, date: d.date })),
    (parsed.costs || []).map((c: any) => ({ label: c.label, amount: c.amount, currency: c.currency })),
    sourceText
  );
  parsed.deadlines = (parsed.deadlines || []).map((d: any, i: number) => ({
    ...d,
    verified: verifiedDeadlines[i]?.verified ?? false,
    matchedSource: verifiedDeadlines[i]?.matchedSource ?? null,
  }));
  parsed.costs = (parsed.costs || []).map((c: any, i: number) => ({
    ...c,
    verified: verifiedCosts[i]?.verified ?? false,
    matchedSource: verifiedCosts[i]?.matchedSource ?? null,
  }));

  const ethConversions: string[] = [];
  for (const d of parsed.deadlines || []) {
    if (d.date && isEthiopianDate(sourceText)) {
      const conv = ethiopianToGregorianApprox(String(d.date));
      if (conv) {
        ethConversions.push(`${conv.ethiopian} ≈ ${conv.gregorian} (approximate, check original)`);
      }
    }
  }

  parsed.warnings = [...(parsed.warnings || []), ...warnings, ...ethConversions];
  // Glossary entries and contact details have to be traceable to the source
  // before they are shown. An invented email address or a made-up definition
  // of a legal term is worse than nothing.
  parsed.glossary = verifyGlossary(parsed.glossary || [], sourceText);
  parsed.contacts = verifyContacts(parsed.contacts || [], sourceText);
  parsed.lang = lang;
  parsed.originalText = sourceText;
  parsed.confidence = parsed.confidence || "medium";
  parsed.level = level;

  const transformed = toFrontendResult(parsed, sourceText);
  addSpend(0.002 * modelCalls);
  inc("explain_success");
  log("info", "explain ok", {
    requestId: opts.requestId,
    lang,
    level,
    ms: Date.now() - start,
    modelCalls,
    verified: verifiedDeadlines.filter((d) => d.verified).length,
  });
  return {
    status: 200,
    body: {
      ok: true,
      data: transformed,
      meta: { requestId: opts.requestId, processingMs: Date.now() - start, version: "1.0", level, modelCalls },
    },
  };
}
