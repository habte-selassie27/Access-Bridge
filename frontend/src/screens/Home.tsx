import { useState, useCallback } from "react";
import { PasteBox } from "../components/input/PasteBox.tsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.tsx";
import { StatusToast, useToasts } from "../components/common/StatusToast.tsx";
import { ErrorState } from "../components/common/ErrorState.tsx";
import { explainDocument } from "../lib/api/explain.ts";
import type { LanguageCode } from "../lib/languages.ts";

export interface HomeProps {
  onResult: (result: any, input: { text?: string; file?: File; lang: string; demoId?: string }) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
}

export function Home({ onResult, lang, onLangChange }: HomeProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, add, dismiss } = useToasts();

  const handleExplain = useCallback(
    async (input: { text?: string; file?: File; lang: string; demoId?: string }) => {
      setProcessing(true);
      setError(null);
      try {
        const { data, error: apiError } = await explainDocument(input);
        if (apiError) {
          add("error", apiError.message);
          setError(apiError.message);
          setProcessing(false);
          return;
        }
        onResult(data, input);
      } catch {
        add("error", "Unable to process the document. Please try again.");
        setError("Unable to process the document.");
        setProcessing(false);
      }
    },
    [lang, onResult, add]
  );

  return (
    <section className="space-y-6">
      <StatusToast toasts={toasts} onDismiss={dismiss} />
      {error && (
        <ErrorState
          title="We could not process this document."
          message={error}
          onRetry={() => setError(null)}
          onExample={() => setError(null)}
        />
      )}
      {processing ? (
        <LoadingSpinner message="Reading your document. This may take a moment." />
      ) : (
        <PasteBox            onExplain={handleExplain}
            lang={lang}
            onLangChange={onLangChange}
          />
      )}
    </section>
  );
}
