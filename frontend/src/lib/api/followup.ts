import { FOLLOWUP_SYSTEM, FOLLOWUP_USER } from "../prompts.ts";
import { isHybridConfigured, initHybrid, isHybridReady, hybridGenerateText } from "../hybrid/index.ts";
import { loadConsent } from "../privacy/consent.ts";
import { toSDKMode, requiresConsent, type PrivacyMode } from "../privacy/modes.ts";

export interface FollowUpRequest {
  docContext: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
  lang: string;
  privacyMode?: PrivacyMode;
}

export async function followupQuestion(req: FollowUpRequest): Promise<{
  data: { answer: string; supported: boolean; sourceReferences: string[]; lang: string; inferenceSource?: "ON_DEVICE" | "IN_CLOUD" };
  warning?: string;
  error?: { code: string; message: string; retryable: boolean };
}> {
  const privacyMode: PrivacyMode = req.privacyMode ?? "smart";
  const consent = loadConsent();
  const consented = consent.cloudConsented;

  if (privacyMode === "cloud" && requiresConsent(privacyMode) && !consented) {
    return { data: null as any, error: { code: "PRIVACY_CONSENT_REQUIRED", message: "Consent is required before sending document content to the cloud.", retryable: false } };
  }

  const sdkMode = toSDKMode(privacyMode, consented);
  const historyText = (req.history || []).map((m) => `${m.role}: ${m.content}`).join("\n");

  if (isHybridConfigured()) {
    initHybrid();
    if (isHybridReady()) {
      const prompt = FOLLOWUP_USER({ docContext: req.docContext, history: historyText, question: req.question, lang: req.lang });
      const r = await hybridGenerateText({ prompt, systemInstruction: FOLLOWUP_SYSTEM, sdkMode });
      if (r) {
        return { data: { answer: r.text, supported: true, sourceReferences: [], lang: req.lang, inferenceSource: r.source } };
      }
      if (privacyMode === "private") {
        return { data: null as any, error: { code: "MODEL_UNAVAILABLE", message: "On-device model unavailable and strict private mode blocks cloud fallback.", retryable: false } };
      }
    }
  }

  if (privacyMode === "private") {
    return { data: null as any, error: { code: "MODEL_UNAVAILABLE", message: "Strict private mode: no cloud fallback.", retryable: false } };
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const env = await res.json();
    if (!res.ok || env?.ok === false) {
      return { data: null as any, error: env?.error || { code: "REQUEST_FAILED", message: "The request failed.", retryable: true } };
    }
    return { data: env.data, warning: env.warning };
  } catch {
    return { data: null as any, error: { code: "NETWORK", message: "We could not reach the server.", retryable: true } };
  }
}