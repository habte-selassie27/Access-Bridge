import { useState } from "react";
import { PRIVACY_MODES, PRIVACY_LABELS, PRIVACY_DESCRIPTIONS, requiresConsent } from "../../lib/privacy/modes.ts";
import { loadConsent, grantConsent, revokeConsent } from "../../lib/privacy/consent.ts";
import { loadPrivacyMode, savePrivacyMode } from "../../lib/privacy/storage.ts";
import type { PrivacyMode } from "../../lib/privacy/modes.ts";

export interface PrivacyModeSelectorProps {
  value?: PrivacyMode;
  onChange?: (mode: PrivacyMode) => void;
}

export function PrivacyModeSelector({ value, onChange }: PrivacyModeSelectorProps) {
  const [internalMode, setInternalMode] = useState<PrivacyMode>(value ?? loadPrivacyMode());
  const mode = value ?? internalMode;
  const [consent, setConsent] = useState(loadConsent());
  const [showConsent, setShowConsent] = useState(false);
  const [pendingMode, setPendingMode] = useState<PrivacyMode | null>(null);

  const handleSelect = (next: PrivacyMode) => {
    if (requiresConsent(next) && !consent.cloudConsented) {
      setPendingMode(next);
      setShowConsent(true);
      return;
    }
    setInternalMode(next);
    savePrivacyMode(next);
    onChange?.(next);
  };

  const acceptConsent = () => {
    const next = grantConsent();
    setConsent(next);
    setShowConsent(false);
    if (pendingMode) {
      setInternalMode(pendingMode);
      savePrivacyMode(pendingMode);
      onChange?.(pendingMode);
      setPendingMode(null);
    }
  };

  const declineConsent = () => {
    setShowConsent(false);
    setPendingMode(null);
  };

  const revoke = () => {
    const next = revokeConsent();
    setConsent(next);
    const m: PrivacyMode = "private";
    setInternalMode(m);
    savePrivacyMode(m);
    onChange?.(m);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">Privacy &amp; AI mode</h2>
        {consent.cloudConsented && (
          <button
            type="button"
            onClick={revoke}
            className="text-[0.7rem] text-subtle underline hover:text-text"
          >
            Revoke cloud consent
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRIVACY_MODES.map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`privacy-mode-${m}`}
              onClick={() => handleSelect(m)}
            className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              mode === m
                ? "border-brand bg-brand/10 text-text"
                : "border-input bg-background text-subtle hover:bg-neutral-subtle-hovered"
            }`}
          >
            <div className="font-medium">{PRIVACY_LABELS[m]}</div>
            <div className="mt-1 text-[0.7rem] leading-relaxed">{PRIVACY_DESCRIPTIONS[m]}</div>
          </button>
        ))}
      </div>
      <p className="text-[0.7rem] text-subtle">
        Current: <strong>{PRIVACY_LABELS[mode]}</strong>
        {consent.cloudConsented ? " · Cloud consent granted" : " · No cloud consent"}
      </p>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl space-y-3">
            <h3 className="text-lg font-semibold text-text">Allow cloud processing?</h3>
            <p className="text-sm text-subtle leading-relaxed">
              This mode may send your document content to Firebase cloud Gemini when the on-device model is
              unavailable or the document is complex. Only grant consent if you are comfortable with that.
              You can revoke consent at any time.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                data-testid="consent-decline"
                onClick={declineConsent}
                className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-text"
              >
                Decline
              </button>
              <button
                type="button"
                data-testid="consent-accept"
                onClick={acceptConsent}
                className="touch-target rounded-md bg-brand px-3 py-2 text-sm text-inverse"
              >
                I consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}