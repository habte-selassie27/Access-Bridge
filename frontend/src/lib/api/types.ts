import type { LanguageTier } from "../languages.ts";

export type LangCode = "en" | "am" | "om" | "ti" | "sw" | "ar" | "fr";

export type ExplainLevel = "simple" | "standard" | "detailed";

export type VerificationStatus = "verified" | "unverified" | "partial" | "relative" | "ambiguous";

export interface Evidence {
  sourceSpan: [number, number];
  quote: string;
  verification: VerificationStatus;
}

export interface Deadline {
  id: string;
  label: string;
  originalValue: string | null;
  normalizedDate: string | null;
  calendar: "ethiopian" | "gregorian" | "unknown";
  deadlineType: "absolute" | "relative" | "range" | "unknown";
  evidence: Evidence | null;
  verified: boolean;
  warning: string | null;
}

export interface Cost {
  id: string;
  label: string;
  originalValue: string;
  amount: number | null;
  currency: string | null;
  evidence: Evidence | null;
  verified: boolean;
  warning: string | null;
}

export interface Action {
  id: string;
  step: string;
  urgent: boolean;
  evidence: Evidence | null;
}

/** A named part of the document, extracted for section-by-section reading. */
export interface Section {
  title: string;
  summary: string;
}

/** A hard term in the document, explained in plain language. */
export interface GlossaryEntry {
  term: string;
  meaning: string;
  /** Verbatim text from the document. Empty when the server could not trace it. */
  quote: string;
}

/** A person, organisation or way to get in touch. */
export interface Contact {
  label: string;
  value: string;
  kind: "email" | "phone" | "address" | "website" | "person" | "organization" | "other";
  /** Verbatim text from the document. Empty when the server could not trace it. */
  quote: string;
}

export type DocType =
  | "government_notice"
  | "medical"
  | "financial"
  | "school"
  | "scholarship"
  | "job"
  | "internship"
  | "grant"
  | "fellowship"
  | "bootcamp"
  | "form"
  | "instructions"
  | "other";

export interface ExplanationResult {
  docType: DocType;
  summary: string;
  actions: Action[];
  /** Who qualifies for this benefit or service. Empty when the document does not say. */
  eligibility: string[];
  /** Where and how to apply. Empty when the document does not say. */
  howToApply: string[];
  deadlines: Deadline[];
  costs: Cost[];
  documentsToBring: string[];
  /** Named parts of the document worth reading on their own. */
  sections: Section[];
  /** Hard terms explained in plain language. */
  glossary: GlossaryEntry[];
  /** People, organisations and ways to get in touch. */
  contacts: Contact[];
  /** Worked examples of how to satisfy a requirement. */
  examples: string[];
  /** The plain-language level this explanation was written at. */
  level: ExplainLevel;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  /**
   * How far the selected explanation language has been measured.
   * Set by the server for every result, so a single answer carries its own
   * translation-quality signal instead of relying on a global tier.
   */
  languageQuality?: LanguageTier;
  lang: LangCode;
  originalLanguage: LangCode;
  originalText: string;
  /** Set only for bundled demo examples, so the UI can use the recorded readout. */
  demoId?: string;
  /** True when this result came from the offline fallback, not the server. */
  offlineDemo?: boolean;
}

/** One published requirement checked against what the reader told us. */
export type EligibilityStatus = "met" | "not_met" | "unknown";

export interface EligibilityItem {
  criterion: string;
  status: EligibilityStatus;
  /** Verbatim quote from the document. Only present when it was found in the source. */
  quote: string | null;
  reason: string;
  /** Set when the model's quote could not be found in the source text. */
  warning: string | null;
}

export interface EligibilityResult {
  items: EligibilityItem[];
  summary: string;
  /** Always present: an assessment, never a promise. */
  disclaimer: string;
  lang: LangCode;
}

export interface ComparisonResult {
  summary: string;
  onlyInA: string[];
  onlyInB: string[];
  differences: string[];
  lang: LangCode;
}

export interface TranslationResult {
  original: string;
  translated: string;
  lang: LangCode;
  sourceLanguage: string;
  /** How the translation was produced. */
  mode?: "document" | "paragraph" | "sentence";
  /** Present for the aligned modes: each piece next to its translation. */
  segments?: { original: string; translated: string }[];
}

export interface GlossaryResult {
  entries: { term: string; meaning: string; quote: string }[];
  examples: string[];
  lang: LangCode;
}

export interface APIEnvelope<T> {
  ok: true;
  data: T;
  /** Set when the server substituted a fallback (e.g. demo data or a local answer). */
  warning?: string;
  meta: {
    requestId: string;
    processingMs: number;
    version: string;
  };
}

export interface APIErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  meta: {
    requestId: string;
  };
}

export type APIResponse<T> = APIEnvelope<T> | APIErrorEnvelope;

export interface FollowUpResponse {
  answer: string;
  supported: boolean;
  sourceReferences: string[];
  lang: string;
}

export interface UIError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface DocumentUIState {
  status: "idle" | "validating" | "processing" | "success" | "error";
  requestId?: string;
  result?: ExplanationResult;
  error?: UIError;
}
