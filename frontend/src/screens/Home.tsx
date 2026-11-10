import { useCallback } from "react";
import { PasteBox } from "../components/input/PasteBox.tsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.tsx";
import { ErrorState } from "../components/common/ErrorState.tsx";
import { explainDocument } from "../lib/api/explain.ts";
import type { LanguageCode } from "../lib/languages.ts";
import { saveLastLanguage } from "../lib/languages.ts";
import {
  useMachine,
  documentReducer,
  initialDocumentState,
} from "../lib/state/index.ts";

export interface HomeProps {
  onResult: (result: any) => void;
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
        onResult(data);
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
          <h1 className="text-3xl font-bold text-text sm:text-4xl">PasteWise</h1>
          <p className="mt-2 text-lg leading-relaxed text-subtle sm:text-xl">
            Understand confusing documents in your own language. Paste or upload any official
            notice — we&rsquo;ll explain what it says, what you need to do, and what&rsquo;s verified.
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

      {/* Privacy */}
      <div className="rounded-lg border border-border bg-surface-muted p-4 text-[0.75rem] text-subtle">
        <div className="mb-2 flex items-center gap-2 font-medium text-text">
          <span className="flex h-4 w-4 items-center justify-center rounded-md border border-border bg-surface text-subtle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><path d="M1 12h4l2 2m0 0l2-2m-2 2v-2"/></svg>
          </span>
          <span>Privacy</span>
        </div>
        <p className="leading-relaxed">
          Your document is processed to create an explanation. PasteWise does not store documents by
          default. External AI services may process document content when live processing is used.
          Demo examples work offline with no API key required.
        </p>
      </div>
    </section>
  );
}
