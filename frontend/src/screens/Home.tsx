import { useCallback, useState } from "react";
import { ArrowRight, FileClock, ShieldCheck } from "lucide-react";
import { PasteBox } from "../components/input/PasteBox.tsx";
import { explainDocument } from "../lib/api/explain.ts";
import { ExplainPageStates, type ExplainLoadingStep } from "../components/result/ExplainPageStates.tsx";
import { preserveOriginalFile } from "../lib/original-file.ts";
import { listDocs } from "../lib/library.ts";
import type { OriginalFile } from "../lib/library.ts";
import type { ExplanationResult } from "../lib/api/types.ts";
import type { LanguageCode } from "../lib/languages.ts";
import { saveLastLanguage } from "../lib/languages.ts";
import { PrivacyModeSelector } from "../components/hybrid/PrivacyModeSelector.tsx";
import { HybridStatus } from "../components/hybrid/HybridStatus.tsx";
import type { PrivacyMode } from "../lib/privacy/modes.ts";
import { useMachine, documentReducer, initialDocumentState } from "../lib/state/index.ts";

export interface HomeProps {
  onResult: (result: ExplanationResult, originalFile?: OriginalFile | null) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
  privacyMode: PrivacyMode;
  onPrivacyModeChange: (mode: PrivacyMode) => void;
}

const STEPS: Array<[string, string, string]> = [
  ["1", "Add document", "Paste or upload a notice, fee letter or form."],
  ["2", "Understand", "Plain-language explanation in your language."],
  ["3", "Take action", "Verified deadlines, costs and a checklist."],
];

export function Home({
  onResult,
  lang,
  onLangChange,
  privacyMode,
  onPrivacyModeChange,
}: HomeProps) {
  const [docState, send] = useMachine(documentReducer, initialDocumentState);
  const processing = docState.status === "processing" || docState.status === "validating";
  const loading: ExplainLoadingStep | null = docState.status === "validating"
    ? "INITIALIZING"
    : docState.status === "processing"
      ? "GENERATING"
      : null;
  const error = docState.status === "error" ? docState.error.message : null;
  const [level, setLevel] = useState<"simple" | "standard" | "detailed">("standard");
  const [lastDoc] = useState(() => listDocs()[0] ?? null);

  const handleExplain = useCallback(
    async (input: { text?: string; file?: File; lang: string; demoId?: string }) => {
      send({ type: "PROCESSING" });
      try {
        const { data, error: apiError } = await explainDocument({ ...input, privacyMode, level });
        if (apiError) {
          send({ type: "ERROR", error: { message: apiError.message } });
          return;
        }
        saveLastLanguage(lang);
        send({ type: "RESET" });
        const originalFile = input.file ? await preserveOriginalFile(input.file) : null;
        onResult(data, originalFile);
      } catch {
        send({ type: "ERROR", error: { message: "Unable to process the document." } });
      }
    },
    [lang, level, onResult, privacyMode, send]
  );

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">Understand your documents.</h1>
          <p className="mt-1 text-sm text-text">Clear explanations, verified details, and next steps.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="How it works">
            {STEPS.map(([number, title, description]) => (
              <li key={number} className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[0.65rem] text-inverse">
                    {number}
                  </span>
                  {title}
                </div>
                <p className="mt-1 text-[0.7rem] leading-snug text-subtle">{description}</p>
              </li>
            ))}
          </ol>
        </div>

        <PrivacyModeSelector value={privacyMode} onChange={onPrivacyModeChange} />
      </div>

      <HybridStatus />

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger">
          <span>
            <strong className="font-semibold">We could not process this document.</strong> {error}
          </span>
          <button
            type="button"
            onClick={() => send({ type: "RESET" })}
            className="shrink-0 rounded border border-danger-border bg-background px-2 py-1 text-[0.75rem] font-medium text-text"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        {processing ? (
          <ExplainPageStates loading={loading} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reading level">
              <span className="text-[0.75rem] font-medium text-subtle">Reading level:</span>
              {(["simple", "standard", "detailed"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLevel(option)}
                  aria-pressed={level === option}
                  className={`touch-target rounded-md border px-2.5 py-1 text-[0.75rem] capitalize ${
                    level === option ? "border-brand bg-brand/10 text-text" : "border-input bg-background text-subtle"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <PasteBox onExplain={handleExplain} lang={lang} onLangChange={onLangChange} />
          </div>
        )}
      </div>

      {lastDoc && (
        <a
          href="/understand"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-brand"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileClock size={16} strokeWidth={2} className="shrink-0 text-subtle" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[0.7rem] text-subtle">Continue with your last document</span>
              <span className="block truncate font-medium text-text">{lastDoc.title}</span>
            </span>
          </span>
          <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-subtle" aria-hidden="true" />
        </a>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3 text-[0.75rem] leading-relaxed text-subtle">
        <ShieldCheck size={15} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Documents stay in this browser unless the mode you choose can send content to the cloud, and that
          only happens after you consent. Clearing site data or using private browsing removes what is saved.
        </p>
      </div>
    </section>
  );
}
