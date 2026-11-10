import { ArrowLeft, Globe, MessageSquare } from "lucide-react";
import { DocumentOverview } from "./DocumentOverview.tsx";
import { ActionChecklist } from "./ActionChecklist.tsx";
import { DeadlineCard } from "./DeadlineCard.tsx";
import { CostCard } from "./CostCard.tsx";
import { DocumentsCard } from "./DocumentsCard.tsx";
import { VerificationSummary } from "./VerificationSummary.tsx";
import { ConfidenceBanner } from "./ConfidenceBanner.tsx";
import { ResultDisclaimer } from "./ResultDisclaimer.tsx";
import { OriginalDocumentViewer } from "../evidence/OriginalDocumentViewer.tsx";
import { ListenButton } from "../audio/ListenButton.tsx";
import type { ExplanationResult } from "../../lib/api/types.ts";
import { languageName } from "../../lib/languages.ts";

export interface ResultViewProps {
  result: ExplanationResult;
  onBack: () => void;
  onLangChange: (code: string) => void;
  onAsk: () => void;
}

export function ResultView({ result, onBack, onLangChange, onAsk }: ResultViewProps) {
  const fullText = [
    result.summary,
    ...result.actions.map((a: { step: string }) => a.step),
    ...result.documentsToBring,
  ].join(". ");

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text transition-colors hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
        <span className="text-[0.75rem] font-medium text-subtle">{languageName(result.lang)}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text">Your explanation</h1>
        <p className="text-sm text-subtle">Checked against the original document.</p>
      </div>

      <DocumentOverview result={result} />
      <ActionChecklist actions={result.actions} />
      <DeadlineCard deadlines={result.deadlines} />
      <CostCard costs={result.costs} />
      <DocumentsCard items={result.documentsToBring} />
      <VerificationSummary deadlines={result.deadlines} costs={result.costs} />
      <ConfidenceBanner result={result} />
      <OriginalDocumentViewer
        enabled={true}
        originalText={result.originalText}
        highlights={[
          ...result.deadlines.flatMap((d) => (d.evidence ? [{ label: d.label, source: d.evidence.quote }] : [])),
          ...result.costs.flatMap((c) => (c.evidence ? [{ label: c.label, source: c.evidence.quote }] : [])),
        ]}
      />
      <ResultDisclaimer />

      <div className="sticky bottom-0 z-20 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_16px_rgba(9,30,66,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
        <ListenButton text={fullText} lang={result.lang} />
        {result.demoId && (
          <div className="flex items-center gap-2">
            <Globe size={16} strokeWidth={2} className="text-subtle" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onLangChange(result.lang === "en" ? "am" : "en")}
              className="touch-target rounded-full border border-input bg-background px-2.5 py-1 text-[0.75rem] transition-colors hover:bg-neutral-subtle-hovered"
              aria-label={`Switch explanation to ${languageName(result.lang === "en" ? "am" : "en")}`}
            >
              <span className="max-[359px]:hidden">Switch to </span>
              {languageName(result.lang === "en" ? "am" : "en")}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onAsk}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-text transition-colors hover:bg-neutral-subtle-hovered"
        >
          <MessageSquare size={18} strokeWidth={2} aria-hidden="true" />
          Ask
        </button>
      </div>
    </section>
  );
}
