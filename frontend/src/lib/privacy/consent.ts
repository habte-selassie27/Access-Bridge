/**
 * Consent state for cloud transfer of document content.
 *
 * Stored locally (localStorage). Consent is required before any cloud transfer
 * of document content (AGENTS.md §7/§13). Revoking consent forces strict local
 * mode until re-granted.
 */
const KEY = "ab_privacy_consent_v1";

export interface ConsentState {
  cloudConsented: boolean;
  consentedAt: number | null;
}

export function loadConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cloudConsented: false, consentedAt: null };
    const parsed = JSON.parse(raw);
    return {
      cloudConsented: Boolean(parsed?.cloudConsented),
      consentedAt: typeof parsed?.consentedAt === "number" ? parsed.consentedAt : null,
    };
  } catch {
    return { cloudConsented: false, consentedAt: null };
  }
}

export function saveConsent(state: ConsentState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore storage failures */
  }
}

export function grantConsent(): ConsentState {
  const next: ConsentState = { cloudConsented: true, consentedAt: Date.now() };
  saveConsent(next);
  return next;
}

export function revokeConsent(): ConsentState {
  const next: ConsentState = { cloudConsented: false, consentedAt: null };
  saveConsent(next);
  return next;
}