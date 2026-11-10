import { useState, useCallback } from "react";
import { ResultView } from "../components/result/ResultView.tsx";
import { FollowUpSheet } from "../components/followup/FollowUpSheet.tsx";
import type { ExplanationResult } from "../lib/api/types.ts";

export interface ResultProps {
  result: ExplanationResult;
  onBack: () => void;
  onLangChange: (code: string) => void;
  /** Shown when a language cannot be served for this document. */
  notice?: string | null;
}

export function Result({ result, onBack, onLangChange, notice }: ResultProps) {
  const [followupOpen, setFollowupOpen] = useState(false);

  const handleAsk = useCallback(() => {
    setFollowupOpen(true);
  }, []);

  return (
    <section className="space-y-6">
      {notice && (
        <p role="alert" className="rounded-md border border-warning-border bg-warning-bg p-3 text-sm text-warning">
          {notice}
        </p>
      )}
      <ResultView result={result} onBack={onBack} onLangChange={onLangChange} onAsk={handleAsk} />
      <FollowUpSheet
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        onAnswer={() => {}}
        docContext={result.originalText}
        lang={result.lang}
      />
    </section>
  );
}
