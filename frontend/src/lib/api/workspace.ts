import { fetchAPI } from "./client.ts";
import type {
  ComparisonResult,
  EligibilityResult,
  ExplanationResult,
  ExplainLevel,
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
  sourceLanguage = "en"
): Promise<{
  data?: TranslationResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<TranslationResult>("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang, sourceLanguage }),
  });
}

export async function checkEligibility(
  sourceText: string,
  profile: string,
  lang: LangCode
): Promise<{
  data?: EligibilityResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<EligibilityResult>("/api/eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText, profile, lang }),
  });
}

export async function compareDocuments(
  textA: string,
  textB: string,
  lang: LangCode
): Promise<{
  data?: ComparisonResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<ComparisonResult>("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ textA, textB, lang }),
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
  level: ExplainLevel
): Promise<{
  data?: ExplanationResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<ExplanationResult>("/api/simplify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText, lang, level }),
  });
}
