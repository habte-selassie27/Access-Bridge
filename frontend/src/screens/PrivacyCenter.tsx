import { useState } from "react";
import { ArrowLeft, ShieldAlert, Cloud, Laptop, Save, Delete } from "lucide-react";
import {
  PRIVACY_MODES,
  PRIVACY_LABELS,
  PRIVACY_DESCRIPTIONS,
  type PrivacyMode,
} from "../lib/privacy/modes.ts";
import { loadConsent, grantConsent, revokeConsent } from "../lib/privacy/consent.ts";
import { loadPrivacyMode, savePrivacyMode } from "../lib/privacy/storage.ts";
import { listDocs, removeDoc } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";

export interface PrivacyCenterProps {
  onBack: () => void;
}

const STORAGE_ITEMS = [
  { label: "Saved documents", note: "Original text and extracted text you chose to keep." },
  { label: "Derived results", note: "Explanations, deadlines, costs and checklists generated from your documents." },
  { label: "Checklist progress", note: "Which action items you've checked off (stored on this device only)." },
  { label: "Settings", note: "Language, reading level, privacy mode, theme and accessibility preferences." },
  { label: "Conversation history", note: "Grounded Q&A scoped to each document, saved only under the stated storage policy." },
] as const;

export function PrivacyCenter({ onBack }: PrivacyCenterProps) {
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() => loadPrivacyMode());
  const [consent, setConsent] = useState(() => loadConsent());
  const [docs, setDocs] = useState<LibraryDoc[]>(listDocs());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleModeChange = (next: PrivacyMode) => {
    setPrivacyMode(next);
    savePrivacyMode(next);
  };

  const handleGrant = () => {
    const next = grantConsent();
    setConsent(next);
  };

  const handleRevoke = () => {
    const next = revokeConsent();
    setConsent(next);
    setPrivacyMode("private");
    savePrivacyMode("private");
  };

  const handleDeleteDoc = (id: string) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    removeDoc(confirmDelete);
    setDocs(listDocs());
    setConfirmDelete(null);
  };

  const handleCancelDelete = () => setConfirmDelete(null);

  const handleDeleteAll = () => {
    if (!window.confirm("Delete all saved documents and derived data on this device? This cannot be undone.")) return;
    for (const d of docs) removeDoc(d.id);
    setDocs(listDocs());
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">Privacy Center</h1>
          <p className="text-sm text-subtle">What stays on this device, what may be transmitted, and how to delete your data.</p>
        </div>
      </div>

      {/* 1. Overview */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <ShieldAlert size={16} strokeWidth={2} aria-hidden="true" /> How your data is handled
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-start gap-2 mb-3">
              <Laptop size={16} strokeWidth={2} className="text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Stays on this device</h3>
            </div>
            <ul className="text-sm text-subtle space-y-2 list-disc pl-5">
              <li>Pasted text and uploaded files you choose to save.</li>
              <li>Generated explanations, deadlines, costs and checklists.</li>
              <li>Your privacy mode and language preferences.</li>
              <li>Inference traces (no document text).</li>
            </ul>
            <p className="mt-3 text-[0.7rem] text-subtle">All of the above live in browser storage (localStorage / IndexedDB) on this device only.</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-start gap-2 mb-3">
              <Cloud size={16} strokeWidth={2} className="text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">May go to Firebase cloud</h3>
            </div>
            <ul className="text-sm text-subtle space-y-2 list-disc pl-5">
              <li>Only when you choose Cloud or Smart hybrid mode and grant consent.</li>
              <li>Only document content needed for the explanation you requested.</li>
              <li>Processed by Firebase AI Logic (Gemini) under your Firebase project.</li>
            </ul>
            <p className="mt-3 text-[0.7rem] text-subtle">Never in Private device only mode. Consent can be revoked at any time (affects future transfers only).</p>
          </div>
        </div>
        <p className="mt-3 text-[0.7rem] text-subtle">
          AccessBridge does not claim "100% private" because cloud paths exist. You control which path is used before any content leaves this device.
        </p>
      </section>

      {/* 2. Privacy mode + consent */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <ShieldAlert size={16} strokeWidth={2} aria-hidden="true" /> Privacy &amp; AI mode
        </h2>
        <p className="text-sm text-subtle mb-3">
          Choose how document content is handled. Unavailable modes are explained, not hidden.
        </p>
        <div className="grid gap-2 sm:grid-cols-3 mb-4">
          {PRIVACY_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                privacyMode === m
                  ? "border-brand bg-brand/10 text-text"
                  : "border-input bg-background text-subtle hover:bg-neutral-subtle-hovered"
              }`}
            >
              <div className="font-medium">{PRIVACY_LABELS[m]}</div>
              <div className="mt-1 text-[0.7rem] leading-relaxed">{PRIVACY_DESCRIPTIONS[m]}</div>
            </button>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text">Cloud consent</span>
            {consent.cloudConsented ? (
              <span className="text-xs font-medium text-success">Granted</span>
            ) : (
              <span className="text-xs font-medium text-muted">Not granted</span>
            )}
          </div>
          <p className="text-sm text-subtle mb-3">
            Smart hybrid and Cloud modes may send document content to the cloud. Grant consent only if you are comfortable with that.
          </p>
          <div className="flex gap-2">
            {consent.cloudConsented ? (
              <button
                type="button"
                onClick={handleRevoke}
                className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-text"
              >
                Revoke consent
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {}}
                  className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-text"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleGrant}
                  className="touch-target rounded-md bg-brand px-3 py-2 text-sm text-inverse"
                >
                  Grant consent
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-[0.7rem] text-subtle">
            Revoking consent switches future requests to Private device only. It cannot retract content already sent.
          </p>
        </div>
      </section>

      {/* 3. Local data management */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <Save size={16} strokeWidth={2} aria-hidden="true" /> Local data on this device
        </h2>
        <p className="text-sm text-subtle mb-4">Browser storage is convenient but not guaranteed: clearing site data or using private/incognito mode can remove it.</p>
        <ul className="text-sm text-subtle space-y-1 list-disc pl-5 mb-4">
          {STORAGE_ITEMS.map((item) => (
            <li key={item.label}>
              <span className="font-medium text-text">{item.label}</span>{" — "}
              {item.note}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-text mb-2">Saved documents ({docs.length})</h3>
            {docs.length === 0 ? (
              <p className="text-sm text-subtle">No saved documents.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface p-2">
                    <span className="truncate text-text max-w-[30rem]">{d.title}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(d.id)}
                      className="touch-target rounded-md border border-input bg-background px-2 py-1 text-[0.7rem] text-subtle hover:text-danger hover:border-danger"
                      aria-label={`Delete ${d.title}`}
                    >
                      <Delete size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {docs.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="mt-3 touch-target rounded-md border border-danger bg-danger/5 px-3 py-2 text-sm text-danger hover:bg-danger hover:text-inverse"
              >
                Delete all documents
              </button>
            )}
          </div>
        </div>
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">Delete document?</h3>
              <button type="button" onClick={handleCancelDelete} className="text-subtle hover:text-text">✕</button>
            </div>
            <p className="text-sm text-subtle">This removes the document and its derived checklist from this device. It cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={handleCancelDelete} className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-text">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="touch-target rounded-md border border-danger bg-danger px-3 py-2 text-sm text-inverse"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
