import { useState } from "react";
import { Globe, Accessibility, Database, Trash2 } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { A11yControls } from "../components/settings/A11yControls.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { SegmentedControl } from "../components/common/SegmentedControl.tsx";
import { clearEverything, listDocs } from "../lib/library.ts";
import { loadLastLanguage, saveLastLanguage, languageName, languageTier } from "../lib/languages.ts";
import type { LanguageCode } from "../lib/languages.ts";

export function Settings() {
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  const [count, setCount] = useState(() => listDocs().length);
  const [confirming, setConfirming] = useState(false);

  return (
    <WorkspaceLayout
      currentPath="/settings"
      title="Settings"
      subtitle="Language and accessibility preferences. Both are stored on this device only."
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
            <Globe size={16} aria-hidden="true" /> Preferred language
          </h2>
          <p className="mb-3 text-[0.8rem] text-subtle">
            Used for new explanations, the voice readout and the follow-up answers.
          </p>
          <LanguageChips
            value={lang}
            onChange={(code) => {
              setLang(code);
              saveLastLanguage(code);
            }}
          />
          <div className="mt-4 space-y-2">
            <p className="form-label">How well each language is backed up</p>
            <SegmentedControl
              label="Language quality"
              value={
                languageTier(lang) === "measured" ? "measured" : languageTier(lang) === "source" ? "source" : "experimental"
              }
              onChange={() => {}}
              options={[
                { value: "source", label: "Source language", hint: "Documents arrive in this language" },
                { value: "measured", label: "Measured", hint: "Amharic, Oromo, Tigrinya — see /eval" },
                { value: "experimental", label: "Experimental", hint: "Not yet evaluated" },
              ]}
              note={`${languageName(lang)} is currently marked "${
                languageTier(lang) === "measured"
                  ? "measured"
                  : languageTier(lang) === "source"
                    ? "source language"
                    : "experimental"
              }". Measured languages have published accuracy numbers on the evaluation page; experimental ones are supported but not yet scored.`}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text">
            <Accessibility size={16} aria-hidden="true" /> Accessibility
          </h2>
          <A11yControls />
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
            <Database size={16} aria-hidden="true" /> Your data
          </h2>
          <p className="text-[0.8rem] text-subtle">
            {count} saved document{count === 1 ? "" : "s"}, plus your checklist progress and translation history, are
            stored in this browser. Nothing is uploaded, and there is no account.
          </p>
          {confirming ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  clearEverything();
                  setCount(0);
                  setConfirming(false);
                }}
                className="touch-target rounded-md bg-danger px-4 py-2 text-sm font-medium text-inverse"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="touch-target mt-3 inline-flex items-center gap-2 rounded-md border border-danger-border px-4 py-2 text-sm text-danger"
            >
              <Trash2 size={15} aria-hidden="true" /> Delete my saved data
            </button>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}
