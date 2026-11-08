import { List, Globe, MessageSquare } from "lucide-react";
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
import { demoAudioUrl } from "../../lib/demo-audio.ts";
import type { ExplanationResult } from "../../lib/api/types.ts";
import type { LanguageCode } from "../../lib/languages.ts";

export interface ResultViewProps {
  result: ExplanationResult;
  onBack: () => void;
  onLangChange: (code: LanguageCode) => void;
  onAsk: () => void;
  switching?: boolean;
  switchError?: string | null;
}

export function ResultView({
  result,
  onBack,
  onLangChange,
  onAsk,
  switching = false,
  switchError = null,
}: ResultViewProps) {
  const fullText = [
    result.summary,
    ...result.actions.map((a) => a.step),
    ...result.documentsToBring,
  ].join(". ");

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          <List size={18} strokeWidth={2} />
          Back
        </button>
        <h1 className="text-xl font-bold text-text-primary">Result</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {result.lang.toUpperCase()}
          </span>
        </div>
      </div>

      <DocumentOverview result={result} />

      <ActionChecklist actions={result.actions} />

      <DeadlineCard deadlines={result.deadlines} />

      <CostCard costs={result.costs} />

      <DocumentsCard items={result.documentsToBring} />

      <VerificationSummary deadlines={result.deadlines} costs={result.costs} />

      <ConfidenceBanner result={result} />

      {switchError && (
        <div className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          {switchError}
        </div>
      )}

      <OriginalDocumentViewer
        enabled={true}
        originalText={result.originalText}
        highlights={[
          ...result.deadlines
            .filter((d) => d.evidence !== null)
            .map((d) => ({
              label: d.label,
              quote: d.evidence!.quote,
              span: d.evidence!.sourceSpan,
            })),
          ...result.costs
            .filter((c) => c.evidence !== null)
            .map((c) => ({
              label: c.label,
              quote: c.evidence!.quote,
              span: c.evidence!.sourceSpan,
            })),
        ]}
      />

      <ResultDisclaimer />

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 rounded-t-xl border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-md">
        <ListenButton
          text={fullText}
          lang={result.lang}
          audioSrc={demoAudioUrl(result.demoId, result.lang)}
        />
        <div className="flex items-center gap-2">
          <Globe size={16} strokeWidth={2} className="text-text-secondary" />
          <button
            type="button"
            onClick={() => onLangChange(result.lang === "en" ? "am" : "en")}
            disabled={switching}
            className="touch-target rounded-full border border-border px-2.5 py-1 text-xs bg-background hover:bg-surface-muted disabled:opacity-50 disabled:pointer-events-none"
          >
            {switching ? "Translating…" : "Switch"}
          </button>
        </div>
        <button
          type="button"
          onClick={onAsk}
          className="touch-target rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary hover:bg-surface-muted"
        >
          <MessageSquare size={18} strokeWidth={2} />
          Ask
        </button>
      </div>
    </section>
  );
}
