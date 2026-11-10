import { useCallback } from "react";
import { PasteBox } from "../components/input/PasteBox.tsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.tsx";
import { ErrorState } from "../components/common/ErrorState.tsx";
import { explainDocument } from "../lib/api/explain.ts";
import { preserveOriginalFile } from "../lib/original-file.ts";
import type { OriginalFile } from "../lib/library.ts";
import type { LanguageCode } from "../lib/languages.ts";
import { saveLastLanguage } from "../lib/languages.ts";
import {
  useMachine,
  documentReducer,
  initialDocumentState,
} from "../lib/state/index.ts";

export interface HomeProps {
  onResult: (result: any, originalFile?: OriginalFile | null) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
}

export function Home({ onResult, lang, onLangChange }: HomeProps) {
  const [docState, send] = useMachine(documentReducer, initialDocumentState);
  const processing = docState.status === "processing" || docState.status === "validating";
  const error = docState.status === "error" ? docState.error.message : null;

  const handleExplain = useCallback(
    async (input: { text?: string; file?: File; lang: string; demoId?: string }) => {
      send({ type: "PROCESSING" });
      try {
        const { data, error: apiError } = await explainDocument(input);
        if (apiError) {
          send({ type: "ERROR", error: { message: apiError.message } });
          return;
        }
        saveLastLanguage(lang);
        send({ type: "RESET" });
        // Keep the uploaded paper next to the explanation when the browser
        // can store it, so the Reader can show the real document too.
        const originalFile = input.file ? await preserveOriginalFile(input.file) : null;
        onResult(data, originalFile);
      } catch {
        send({ type: "ERROR", error: { message: "Unable to process the document." } });
      }
    },
    [lang, onResult, send]
  );

  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <div className="max-w-[60ch]">
          <h1 className="text-3xl font-bold text-text sm:text-4xl">AccessBridge</h1>
          <p className="mt-1 text-base font-medium text-brand">One question. Any language. Every opportunity.</p>
          <p className="mt-2 text-lg leading-relaxed text-subtle sm:text-xl">
            Upload a document — a scholarship, a service notice, a fee letter — and get it back in
            plain language in your own language, with every date and amount checked against the
            original.
          </p>
        </div>
      </div>

      {/* Input card */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        {error && (
          <ErrorState
            title="We could not process this document."
            message={error}
            onRetry={() => send({ type: "RESET" })}
          />
        )}
        {processing ? (
          <LoadingSpinner message="Reading your document. This may take a moment." />
        ) : (
          <PasteBox onExplain={handleExplain} lang={lang} onLangChange={onLangChange} />
        )}
      </div>

      {/* Upload wizard CTA */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Step-by-step upload</h2>
          <p className="text-sm text-subtle">Upload a real document and walk through explain, verify, listen, ask, evaluate.</p>
        </div>
        <a
          href="/upload"
          className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-inverse"
        >
          Upload a document
        </a>
      </div>

      {/* Workspace CTA */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-text">The full workspace</h2>
        <p className="mt-1 text-sm text-subtle">
          Translate, simplify, listen, compare, check your eligibility and keep your documents — all on
          this device.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/dashboard"
            className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-inverse"
          >
            Open the dashboard
          </a>
          <a
            href="/upload"
            className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm text-text"
          >
            Read a document first
          </a>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-lg border border-border bg-surface-muted p-4 text-[0.75rem] text-subtle">
        <div className="mb-2 flex items-center gap-2 font-medium text-text">
          <span className="flex h-4 w-4 items-center justify-center rounded-md border border-border bg-surface text-subtle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><path d="M1 12h4l2 2m0 0l2-2m-2 2v-2"/></svg>
          </span>
          <span>Privacy</span>
        </div>
        <p className="leading-relaxed">
          Your document is processed to create an explanation. AccessBridge does not store documents by
          default. External AI services may process document content when live processing is used.
          Demo examples work offline with no API key required.
        </p>
      </div>
    </section>
  );
}
