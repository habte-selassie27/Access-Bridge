import { ArrowLeft, Globe, MessageSquare, ListTree } from "lucide-react";
import { DocumentOverview } from "./DocumentOverview.tsx";
import { ActionChecklist } from "./ActionChecklist.tsx";
import { OpportunityCard } from "./OpportunityCard.tsx";
import { DeadlineCard } from "./DeadlineCard.tsx";
import { CostCard } from "./CostCard.tsx";
import { DocumentsCard } from "./DocumentsCard.tsx";
import { VerificationSummary } from "./VerificationSummary.tsx";
import { ConfidenceBanner } from "./ConfidenceBanner.tsx";
import { ResultDisclaimer } from "./ResultDisclaimer.tsx";
import { OriginalDocumentViewer } from "../evidence/OriginalDocumentViewer.tsx";
import { ListenButton } from "../audio/ListenButton.tsx";
import { EligibilityCheck } from "./EligibilityCheck.tsx";
import { GlossaryCard } from "./GlossaryCard.tsx";
import { ContactsCard } from "./ContactsCard.tsx";
import type { ExplanationResult } from "../../lib/api/types.ts";
import { languageName, LANGUAGES, isRtl } from "../../lib/languages.ts";

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
        <p className="text-sm text-subtle">
          Checked against the original document.
          {result.level && result.level !== "standard" && (
            <span className="ml-1 rounded bg-surface-muted px-1.5 py-0.5 text-[0.7rem] uppercase tracking-wide">
              {result.level}
            </span>
          )}
        </p>
      </div>

      {/* The explanation text is in the target language; the chrome around
          it stays in the interface language. */}
      <div lang={result.lang} dir={isRtl(result.lang) ? "rtl" : "ltr"} className="space-y-5">
        <DocumentOverview result={result} />
        <ActionChecklist actions={result.actions} />
        <OpportunityCard eligibility={result.eligibility || []} howToApply={result.howToApply || []} />
        <DeadlineCard deadlines={result.deadlines} />
        <CostCard costs={result.costs} />
        <DocumentsCard items={result.documentsToBring} />
        {result.examples && result.examples.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-2 text-base font-semibold text-text">What this looks like in practice</h2>
            <ul className="space-y-1 text-sm text-subtle">
              {result.examples.map((example, i) => (
                <li key={i}>• {example}</li>
              ))}
            </ul>
          </section>
        )}
        <GlossaryCard entries={result.glossary || []} />
        <ContactsCard contacts={result.contacts || []} />
        {result.sections && result.sections.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
              <ListTree size={16} aria-hidden="true" /> Important parts of this document
            </h2>
            <ul className="space-y-2">
              {result.sections.map((s, i) => (
                <li key={i} className="rounded-md border border-border bg-background p-3">
                  <p className="text-sm font-medium text-text">{s.title}</p>
                  <p className="text-[0.8rem] text-subtle">{s.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(result.eligibility || []).length > 0 && (
          <EligibilityCheck
            sourceText={result.originalText}
            result={{ originalText: result.originalText, eligibility: result.eligibility }}
            lang={result.lang}
          />
        )}
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
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_16px_rgba(9,30,66,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
        <ListenButton text={fullText} lang={result.lang} demoId={result.demoId} />
        <div className="flex items-center gap-2">
          <Globe size={16} strokeWidth={2} className="text-subtle" aria-hidden="true" />
          <label className="flex items-center gap-1">
            <span className="sr-only">Language of the explanation</span>
            <select
              value={result.lang}
              onChange={(e) => onLangChange(e.target.value)}
              className="touch-target max-w-[9.5rem] rounded-full border border-input bg-background px-2 py-1 text-[0.75rem] text-text"
              aria-label="Language of the explanation"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {languageName(lang.code)}
                </option>
              ))}
            </select>
          </label>
        </div>
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
