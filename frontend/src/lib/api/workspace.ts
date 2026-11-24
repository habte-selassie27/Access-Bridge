import { fetchAPI } from "./client.ts";
import { TRANSLATE_SYSTEM, TRANSLATE_USER, GLOSSARY_SYSTEM, GLOSSARY_USER, COMPARE_SYSTEM, COMPARE_USER, ELIGIBILITY_SYSTEM, ELIGIBILITY_USER } from "../prompts.ts";
import { explainDocument } from "./explain.ts";
import { isHybridConfigured, initHybrid, isHybridReady, hybridGenerateStructured, hybridGenerateText } from "../hybrid/index.ts";
import { loadConsent } from "../privacy/consent.ts";
import { toSDKMode, type PrivacyMode } from "../privacy/modes.ts";
import { TranslateSchema, GlossarySchema, CompareSchema, EligibilitySchema } from "../hybrid/schema.ts";
import type {
  ComparisonResult,
  EligibilityResult,
  ExplanationResult,
  ExplainLevel,
  GlossaryResult,
  LangCode,
  TranslationResult,
} from "./types.ts";

export interface ImportedPage {
  url: string;
  title: string;
  text: string;
  charCount: number;
}

export async function importPage(url: string): Promise<{
  data?: ImportedPage;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<ImportedPage>("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export async function translateText(
  text: string,
  lang: LangCode,
  sourceLanguage = "en",
  mode: "document" | "paragraph" | "sentence" = "document",
  privacyMode: PrivacyMode = "smart"
): Promise<{
  data?: TranslationResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const safeText = String(text || "").trim();
  if (!safeText) {
    return { error: { code: "INVALID_INPUT", message: "text required.", retryable: false } };
  }
  const consented = loadConsent().cloudConsented;
  const sdkMode = toSDKMode(privacyMode, consented);
  // Hybrid path.
  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      const prompt = TRANSLATE_USER({ text: safeText, lang });
      const r = await hybridGenerateStructured<any>({ prompt, systemInstruction: TRANSLATE_SYSTEM, schema: TranslateSchema, sdkMode });
      if (r?.data?.translated) {
        return {
          data: {
            original: safeText,
            translated: String(r.data.translated),
            lang,
            sourceLanguage,
            mode: "document",
          },
        };
      }
      // Fallback to plain text generation if structured parse fails.
      const r2 = await hybridGenerateText({ prompt, systemInstruction: TRANSLATE_SYSTEM, sdkMode });
      if (r2?.text) {
        try {
          const raw = JSON.parse(r2.text.replace(/```json\n?|\n?```/g, "").trim());
          const translated = String(raw?.translated ?? raw?.text ?? r2.text).trim();
          if (translated) {
            return { data: { original: safeText, translated, lang, sourceLanguage, mode: "document" } };
          }
        } catch {
          if (r2.text.trim()) {
            return { data: { original: safeText, translated: r2.text.trim(), lang, sourceLanguage, mode: "document" } };
          }
        }
      }
    }
  }
  // Server fallback.
  return fetchAPI<TranslationResult>("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: safeText, lang, sourceLanguage, mode }),
  });
}

/** The hard words of a document, explained in plain language. */
export async function buildGlossary(
  sourceText: string,
  lang: LangCode,
  terms: string[] = [],
  privacyMode: PrivacyMode = "smart"
): Promise<{
  data?: GlossaryResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const doc = String(sourceText || "").trim();
  if (!doc) {
    return { error: { code: "INVALID_INPUT", message: "The document text is required.", retryable: false } };
  }
  const consented = loadConsent().cloudConsented;
  const sdkMode = toSDKMode(privacyMode, consented);
  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      const requested = (terms || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
      const prompt = GLOSSARY_USER({ docContext: doc, terms: requested.join(", "), lang });
      const r = await hybridGenerateStructured<any>({ prompt, systemInstruction: GLOSSARY_SYSTEM, schema: GlossarySchema, sdkMode });
      if (r?.data) {
        const entries = Array.isArray(r.data.entries) ? r.data.entries : [];
        const examples = Array.isArray(r.data.examples) ? r.data.examples : [];
        return {
          data: {
            entries: entries
              .map((e: any) => ({
                term: String(e?.term ?? "").trim(),
                meaning: String(e?.meaning ?? "").trim(),
                quote: String(e?.quote ?? "").trim(),
              }))
              .filter((e: any) => e.term && e.meaning),
            examples: examples.slice(0, 3).map((x: any) => String(x).trim()).filter(Boolean),
            lang,
          },
        };
      }
    }
  }
  return fetchAPI<GlossaryResult>("/api/glossary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText: doc, lang, terms }),
  });
}

export async function checkEligibility(
  sourceText: string,
  profile: string,
  lang: LangCode,
  privacyMode: PrivacyMode = "smart"
): Promise<{
  data?: EligibilityResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const doc = String(sourceText || "").trim();
  if (!doc) {
    return { error: { code: "INVALID_INPUT", message: "The document text is required.", retryable: false } };
  }
  const consented = loadConsent().cloudConsented;
  const sdkMode = toSDKMode(privacyMode, consented);
  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      const prompt = ELIGIBILITY_USER({ docContext: doc, profile, lang });
      const r = await hybridGenerateStructured<any>({ prompt, systemInstruction: ELIGIBILITY_SYSTEM, schema: EligibilitySchema, sdkMode });
      if (r?.data) {
        const items = Array.isArray(r.data.items) ? r.data.items : [];
        return {
          data: {
            items: items.map((it: any) => ({
              criterion: String(it?.criterion ?? "").trim(),
              status: (["met", "not_met", "unknown"].includes(it?.status) ? it.status : "unknown") as any,
              quote: it?.quote ? String(it.quote).trim() : null,
              reason: String(it?.reason ?? "").trim(),
              warning: null,
            })),
            summary: String(r.data.summary ?? "").trim(),
            disclaimer: "An assessment against the published requirements, never a prediction of acceptance.",
            lang,
          },
        };
      }
    }
  }
  return fetchAPI<EligibilityResult>("/api/eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText: doc, profile, lang }),
  });
}

export async function compareDocuments(
  textA: string,
  textB: string,
  lang: LangCode,
  privacyMode: PrivacyMode = "smart"
): Promise<{
  data?: ComparisonResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const a = String(textA || "").trim();
  const b = String(textB || "").trim();
  if (!a || !b) {
    return { error: { code: "INVALID_INPUT", message: "Both documents are required.", retryable: false } };
  }
  const consented = loadConsent().cloudConsented;
  const sdkMode = toSDKMode(privacyMode, consented);
  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      const prompt = COMPARE_USER({ docA: a, docB: b, lang });
      const r = await hybridGenerateStructured<any>({ prompt, systemInstruction: COMPARE_SYSTEM, schema: CompareSchema, sdkMode });
      if (r?.data) {
        return {
          data: {
            summary: String(r.data.summary ?? "").trim(),
            onlyInA: Array.isArray(r.data.onlyInA) ? r.data.onlyInA.map((x: any) => String(x)) : [],
            onlyInB: Array.isArray(r.data.onlyInB) ? r.data.onlyInB.map((x: any) => String(x)) : [],
            differences: Array.isArray(r.data.differences) ? r.data.differences.map((x: any) => String(x)) : [],
            lang,
          },
        };
      }
    }
  }
  return fetchAPI<ComparisonResult>("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ textA: a, textB: b, lang }),
  });
}

/**
 * Re-explain a document at a different plain-language level.
 *
 * The document is read again from the original text and every date and amount
 * is verified again, so changing the level can never smuggle in an
 * unverified number.
 */
export async function simplifyDocument(
  sourceText: string,
  lang: LangCode,
  level: ExplainLevel,
  privacyMode: PrivacyMode = "smart"
): Promise<{
  data?: ExplanationResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const doc = String(sourceText || "").trim();
  if (!doc) {
    return { error: { code: "INVALID_INPUT", message: "Nothing to simplify. Provide the document text.", retryable: false } };
  }
  return explainDocument({ text: doc, lang, level, privacyMode });
}
