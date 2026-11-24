import { offlineDemoResult } from "../fallbackResults.ts";
import { resolveDemo, demoSource } from "../demo.ts";
import type { ExplanationResult } from "./types.ts";
import { toFrontendResult, normalizeModelOutput } from "../transform.ts";
import { EXPLAIN_SYSTEM, EXPLAIN_USER } from "../prompts.ts";
import { ExplainResponseSchema } from "../schema.ts";
import {
  isHybridConfigured,
  isHybridReady,
  initHybrid,
  hybridGenerateStructured,
  getDeviceModelAvailability,
  getLastHybridError,
} from "../hybrid/index.ts";
import { ExplainJsonSchema } from "../hybrid/schema.ts";
import { fitsLocalBudget, LOCAL_MAX_SOURCE_CHARS } from "../hybrid/budget.ts";
import { sanitizeText, detectInjection } from "../security/input-guard.ts";
import { chunkText, mergeChunkResults } from "../documents/chunks.ts";
import { loadConsent } from "../privacy/consent.ts";
import { planRoute, type PrivacyMode } from "../privacy/modes.ts";
import { languageNameForPrompt, textLooksInLanguage, looksLikeEnglish } from "../languages.ts";
import { languageExampleBlock } from "../language-examples.ts";

/** Human-readable fields only; JSON keys and quotes would skew detection. */
function explanationProse(parsed: any): string {
  return [
    parsed?.summary,
    ...(Array.isArray(parsed?.actions) ? parsed.actions.map((a: any) => a?.step) : []),
    ...(Array.isArray(parsed?.eligibility) ? parsed.eligibility : []),
    ...(Array.isArray(parsed?.howToApply) ? parsed.howToApply : []),
    ...(Array.isArray(parsed?.documentsToBring) ? parsed.documentsToBring : []),
    ...(Array.isArray(parsed?.warnings) ? parsed.warnings : []),
  ]
    .filter((value: any) => typeof value === "string" && value.trim())
    .join(" ");
}

export interface ExplainRequest {
  text?: string;
  file?: File;
  lang: string;
  demoId?: string;
  level?: string;
  privacyMode?: PrivacyMode;
}

export async function explainDocument(req: ExplainRequest): Promise<{
  data: ExplanationResult;
  warning?: string;
  error?: { code: string; message: string; retryable: boolean };
  inferenceSource?: "ON_DEVICE" | "IN_CLOUD";
}> {
  let demoFallbackText = "";
  if (req.demoId) {
    const resolved = resolveDemo(req.demoId, req.lang);
    if (resolved) return { data: resolved };
    // No recorded output in this language: explain the bundled source live.
    // Never substitute English text under a non-English label.
    demoFallbackText = demoSource(req.demoId) ?? "";
  }

  const privacyMode: PrivacyMode = req.privacyMode ?? "smart";
  const consented = loadConsent().cloudConsented;
  const deviceAvailable = (await getDeviceModelAvailability()) === "available";
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  // Deterministic privacy policy gate (AGENTS.md §8): decide before any transfer.
  const plan = planRoute({ mode: privacyMode, consented, deviceAvailable, online });
  if (!plan.allowed) {
    const msg =
      plan.reason === "cloud_consent_required"
        ? "Consent is required before sending document content to the cloud."
        : plan.reason === "cloud_offline"
          ? "Cloud mode requires a network connection."
          : "On-device model unavailable and strict local mode blocks cloud fallback.";
    const code =
      plan.reason === "cloud_consent_required"
        ? "PRIVACY_CONSENT_REQUIRED"
        : plan.reason === "cloud_offline"
          ? "OFFLINE_CLOUD_UNAVAILABLE"
          : "MODEL_UNAVAILABLE";
    return { data: null as unknown as ExplanationResult, error: { code, message: msg, retryable: false } };
  }
  let sdkMode = plan.sdkMode;

  let sourceText = req.text ?? demoFallbackText;

  // File input: extract text via the server OCR. In strict private mode, OCR is
  // a network operation and is blocked; the user must paste text instead.
  if (req.file) {
    if (privacyMode === "private") {
      return {
        data: null as unknown as ExplanationResult,
        error: { code: "UNSUPPORTED_INPUT", message: "Strict private mode cannot read files via server OCR. Paste the text instead.", retryable: false },
      };
    }
    const form = new FormData();
    form.append("file", req.file, req.file.name);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/extract`, {
        method: "POST",
        body: form,
      });
      if (!r.ok) throw new Error("extract failed");
      const env = await r.json();
      const extracted = env?.data?.text ?? env?.text;
      if (typeof extracted === "string" && extracted.trim()) {
        sourceText = sourceText ? `${sourceText}\n${extracted}` : extracted;
      } else {
        return {
          data: null as unknown as ExplanationResult,
          error: { code: "UPSTREAM", message: "Could not read the file. Try a clearer image or paste text.", retryable: true },
        };
      }
    } catch {
      return {
        data: null as unknown as ExplanationResult,
        error: { code: "NETWORK", message: "We could not reach the server for file reading. Check your connection.", retryable: true },
      };
    }
  }

  if (!sourceText.trim()) {
    return {
      data: null as unknown as ExplanationResult,
      error: { code: "INVALID_INPUT", message: "No text or file provided.", retryable: false },
    };
  }

  // Treat document text as untrusted: strip hidden/control chars before use.
  sourceText = sanitizeText(sourceText);
  const injectionDetected = detectInjection(sourceText);

  // On-device token budget: never silently truncate. If the document is too big
  // for the local model, either escalate to a consented cloud path or fail visibly.
  if (!fitsLocalBudget(sourceText)) {
    if (sdkMode === "ONLY_ON_DEVICE") {
      return {
        data: null as unknown as ExplanationResult,
        error: { code: "INPUT_TOO_LARGE", message: "This document is too long for the on-device model. Use Smart hybrid or Cloud (with consent), or paste a shorter excerpt.", retryable: false },
      };
    }
    sdkMode = "ONLY_IN_CLOUD";
  }

  // Hybrid inference path (Firebase AI Logic).
  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      // Few-shot examples make low-resource languages far more reliable, but
      // they add ~1,200 tokens. Keep them for documents that still fit the
      // on-device budget with the example included; long documents rely on the
      // explicit language instruction and chunking instead.
      const exampleBlock = sourceText.length <= 12000 ? languageExampleBlock(req.lang) : "";
      const runOnce = async (text: string) => {
        const prompt = EXPLAIN_USER({ text, lang: req.lang, level: req.level || "standard", exampleBlock });
        let r = await hybridGenerateStructured<any>({ prompt, systemInstruction: EXPLAIN_SYSTEM, schema: ExplainJsonSchema, sdkMode });
        if (!r) return null;
        let parsed: any;
        try {
          parsed = normalizeModelOutput(r.data, text, req.lang);
        } catch {
          parsed = r.data;
        }
        // The model sometimes ignores the language line and answers in English.
        // For scripts we can check (Ethiopic, Arabic) and for Latin-script
        // targets we can detect English stopwords; retry once with a firmer
        // instruction instead of showing English under a non-English label.
        if (!textLooksInLanguage(explanationProse(parsed), req.lang)) {
          const retryPrompt =
            prompt +
            `\n\nThe previous answer was not written in ${languageNameForPrompt(req.lang)}. ` +
            `You MUST write the summary and every explanation field in ${languageNameForPrompt(req.lang)}, not English.`;
          const retry = await hybridGenerateStructured<any>({ prompt: retryPrompt, systemInstruction: EXPLAIN_SYSTEM, schema: ExplainJsonSchema, sdkMode });
          if (retry) {
            try {
              parsed = normalizeModelOutput(retry.data, text, req.lang);
            } catch {
              parsed = retry.data;
            }
            r = retry;
          }
        }
        // Still the wrong language after a retry: label the result honestly
        // instead of presenting English as the requested language
        // (AGENTS.md §12).
        const finalProse = explanationProse(parsed);
        if (!textLooksInLanguage(finalProse, req.lang) && parsed && typeof parsed === "object") {
          parsed.requestedLang = req.lang;
          parsed.languageMismatch = true;
          if (looksLikeEnglish(finalProse)) parsed.lang = "en";
          parsed.warnings = [
            ...(Array.isArray(parsed.warnings) ? parsed.warnings : []),
            `You asked for ${languageNameForPrompt(req.lang)}, but the model answered in ${looksLikeEnglish(finalProse) ? "English" : "another language"}. Try again, or switch to Smart hybrid or Cloud.`,
          ];
        }
        const v = ExplainResponseSchema.safeParse(parsed);
        if (v.success) parsed = v.data;
        return { parsed, source: r.source, latencyMs: r.latencyMs };
      };

      let combined: any = null;
      let actualSource: "ON_DEVICE" | "IN_CLOUD" | undefined;
      let latency = 0;

      const tooLong = sourceText.length > LOCAL_MAX_SOURCE_CHARS;
      if (tooLong && sdkMode !== "ONLY_ON_DEVICE") {
        // Long document: read each budget-sized chunk, merge deterministically.
        const chunks = chunkText(sourceText, { maxChars: LOCAL_MAX_SOURCE_CHARS });
        const parts: any[] = [];
        let failed = 0;
        for (const c of chunks) {
          const r = await runOnce(c.text);
          if (r) {
            parts.push(r.parsed);
            actualSource = r.source;
            latency += r.latencyMs;
          } else failed++;
        }
        if (parts.length > 0) {
          combined = mergeChunkResults(parts, req.lang);
          if (failed > 0 || parts.length < chunks.length) {
            combined.warnings = [
              ...(combined.warnings || []),
              `This document is long: ${parts.length} of ${chunks.length} parts were read. Check the original for anything important.`,
            ];
          }
        }
      } else {
        const r = await runOnce(sourceText);
        if (r) {
          combined = r.parsed;
          actualSource = r.source;
          latency = r.latencyMs;
        }
      }

      if (combined) {
        // Keep a detected mismatch language (e.g. English) so the UI does not
        // label English text as Afaan Oromoo.
        combined.lang = combined.lang || req.lang;
        combined.originalText = sourceText;
        combined.level = req.level || "standard";
        const transformed = toFrontendResult(combined, sourceText);
        transformed.inferenceSource = actualSource;
        transformed.inferenceLatencyMs = latency;
        if (req.file) {
          transformed.ocrUsed = true;
          transformed.warnings = [
            ...(transformed.warnings || []),
            "Text was transcribed from your file (OCR). Check the original image for accuracy.",
          ];
        }
        if (injectionDetected) {
          transformed.warnings = [
            ...(transformed.warnings || []),
            "This document contains text that looks like instructions to an AI. It was treated as data only.",
          ];
        }
        return { data: transformed as ExplanationResult, inferenceSource: actualSource };
      }
      // A failed Firebase attempt is reported, never handed to the legacy
      // server provider: substituting a different model would hide where the
      // document went (AGENTS.md §5, §8).
      const hybridError = getLastHybridError();
      if (privacyMode === "private") {
        return {
          data: null as unknown as ExplanationResult,
          error: {
            code: "MODEL_UNAVAILABLE",
            message:
              hybridError?.message ??
              "The on-device model could not answer. Strict private mode will not send your document to the cloud.",
            retryable: false,
          },
        };
      }
      return {
        data: null as unknown as ExplanationResult,
        error: {
          code: hybridError?.code ?? "PROVIDER_ERROR",
          message:
            hybridError?.message ??
            "Firebase AI Logic did not return a result. Check App Check and your connection, then retry.",
          retryable: hybridError?.code === "RATE_LIMITED",
        },
      };
    }
    // Configured but the SDK could not initialise: still do not use the
    // legacy provider for the primary explanation path.
    return {
      data: null as unknown as ExplanationResult,
      error: {
        code: "PROVIDER_ERROR",
        message:
          "Firebase AI Logic is configured but the SDK could not initialise. Check App Check and the VITE_FIREBASE_* values.",
        retryable: false,
      },
    };
  }

  // Server fallback: only allowed in non-private modes with consent (or when
  // hybrid is not configured). In strict private mode we never reach here.
  if (privacyMode === "private") {
    return {
      data: null as unknown as ExplanationResult,
      error: { code: "MODEL_UNAVAILABLE", message: "On-device model unavailable and strict private mode blocks cloud fallback.", retryable: false },
    };
  }

  const form = new FormData();
  form.append("lang", req.lang);
  if (req.level) form.append("level", req.level);
  if (req.file) form.append("file", req.file, req.file.name);
  else form.append("text", sourceText);

  let response: { data: ExplanationResult; warning?: string; error?: { code: string; message: string; retryable: boolean } };
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/explain`, {
      method: "POST",
      body: form,
    }).then(async (res) => {
      const env = await res.json();
      if (!res.ok || env?.ok === false) {
        return { data: null as unknown as ExplanationResult, error: env?.error || { code: "REQUEST_FAILED", message: "The request failed.", retryable: true } };
      }
      return { data: env.data, warning: env.warning };
    });
  } catch {
    response = {
      data: null as unknown as ExplanationResult,
      error: { code: "NETWORK", message: "We could not reach the server. Check your connection and try again.", retryable: true },
    };
  }

  if (response.error) {
    if (!req.file && sourceText) {
      const fallback = offlineDemoResult(sourceText, req.lang);
      if (fallback) {
        return { data: fallback, warning: "You appear to be offline. Showing the saved example result." };
      }
    }
    return { data: null as unknown as ExplanationResult, error: response.error };
  }

  return response;
}
