export type LangCode = "am" | "om" | "ti" | "en";

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
