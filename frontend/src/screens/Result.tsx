import { useState, useCallback } from "react";
import { ResultView } from "../components/result/ResultView.tsx";
import { FollowUpSheet } from "../components/followup/FollowUpSheet.tsx";
import type { ExplanationResult } from "../lib/api/types.ts";
import type { LanguageCode } from "../lib/languages.ts";

export interface ResultProps {
  result: ExplanationResult;
  onBack: () => void;
  onLangChange: (code: LanguageCode) => void;
  switching?: boolean;
  switchError?: string | null;
}

function buildDocContext(result: ExplanationResult): string {
  const lines = [
    `Summary: ${result.summary}`,
    ...result.actions.map((a) => `Action: ${a.step}`),
    ...result.deadlines.map(
      (d) => `Deadline (${d.label}): ${d.originalValue ?? d.normalizedDate ?? "not stated"}`
    ),
    ...result.costs.map((c) => `Cost (${c.label}): ${c.originalValue}`),
    ...result.documentsToBring.map((d) => `Documents to bring: ${d}`),
  ];
  return `${lines.join("\n")}\n\nOriginal document:\n${result.originalText}`;
}

export function Result({ result, onBack, onLangChange, switching = false, switchError = null }: ResultProps) {
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
        switching={switching}
        switchError={switchError}
      />
      <FollowUpSheet
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        docContext={buildDocContext(result)}
        lang={result.lang}
      />
    </section>
  );
}
