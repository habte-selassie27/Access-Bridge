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

export interface ExplanationResult {
  docType: "government_notice" | "medical" | "financial" | "school" | "other";
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
  /** The plain-language level this explanation was written at. */
  level: ExplainLevel;
  confidence: "high" | "medium" | "low";
  warnings: string[];
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
