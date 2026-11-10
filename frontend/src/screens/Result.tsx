import { useState, useCallback } from "react";
import { ResultView } from "../components/result/ResultView.tsx";
import { FollowUpSheet } from "../components/followup/FollowUpSheet.tsx";
import type { ExplanationResult } from "../lib/api/types.ts";

export interface ResultProps {
  result: ExplanationResult;
  onBack: () => void;
  onLangChange: (code: string) => void;
}

export function Result({ result, onBack, onLangChange }: ResultProps) {
  const [followupOpen, setFollowupOpen] = useState(false);

  const handleAsk = useCallback(() => {
    setFollowupOpen(true);
  }, []);

  return (
    <section className="space-y-6">
      <ResultView
        result={result}
        onBack={onBack}
        onLangChange={onLangChange}
        onAsk={handleAsk}
      />
      <FollowUpSheet
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        onAnswer={() => {}}
      />
    </section>
  );
}
