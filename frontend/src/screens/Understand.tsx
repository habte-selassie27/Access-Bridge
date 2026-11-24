import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Laptop,
  Cloud,
  Package,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { DocumentOverview } from "../components/result/DocumentOverview.tsx";
import { ActionChecklist } from "../components/result/ActionChecklist.tsx";
import { DeadlineCard } from "../components/result/DeadlineCard.tsx";
import { CostCard } from "../components/result/CostCard.tsx";
import { DocumentsCard } from "../components/result/DocumentsCard.tsx";
import { GlossaryCard } from "../components/result/GlossaryCard.tsx";
import { ContactsCard } from "../components/result/ContactsCard.tsx";
import { VerificationSummary } from "../components/result/VerificationSummary.tsx";
import { ConfidenceBanner } from "../components/result/ConfidenceBanner.tsx";
import { OriginalDocumentViewer } from "../components/evidence/OriginalDocumentViewer.tsx";
import { FollowUpSheet } from "../components/followup/FollowUpSheet.tsx";
import { ListenButton } from "../components/audio/ListenButton.tsx";
import { LANGUAGES, isRtl, type LanguageCode } from "../lib/languages.ts";
import { explainDocument } from "../lib/api/explain.ts";
import type { PrivacyMode } from "../lib/privacy/modes.ts";
import type { ExplanationResult } from "../lib/api/types.ts";

export interface UnderstandProps {
  result: ExplanationResult | null;
  lang?: LanguageCode;
  privacyMode: PrivacyMode;
  capability?: string;
  online?: boolean;
  onLangChange: (code: LanguageCode) => void;
  onResultUpdate: (result: ExplanationResult) => void;
  onGoToHome: () => void;
  onGoToActions: () => void;
  onGoToHybridLab?: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  government_notice: "Government notice",
  medical: "Medical document",
  financial: "Financial document",
  school: "School document",
  scholarship: "Scholarship",
  job: "Job announcement",
  internship: "Internship",
  grant: "Grant or funding",
  fellowship: "Fellowship",
  bootcamp: "Training programme",
  form: "Form to fill in",
  instructions: "Instructions",
  other: "Other document",
};

function ExecutionBadge({ result }: { result: ExplanationResult }) {
  const source = result.inferenceSource;
  const config =
    source === "ON_DEVICE"
      ? {
          icon: Laptop,
          label: "Processed on this device",
          detail: "Gemini Nano. Your document did not leave the browser.",
          className: "border-success-border bg-success-bg text-success-bolder",
        }
      : source === "IN_CLOUD"
        ? {
            icon: Cloud,
            label: "Processed in cloud",
            detail: "Gemini via Firebase AI Logic, after your consent.",
            className: "border-information bg-information-bg text-information",
          }
        : {
            icon: Package,
            label: "Bundled demo",
            detail: "Precomputed example, not live model output.",
            className: "border-border bg-surface-muted text-subtle",
          };
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[0.75rem] ${config.className}`}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span className="font-medium">{config.label}</span>
      <span className="hidden text-[0.7rem] opacity-80 sm:inline">{config.detail}</span>
    </div>
  );
}

function EmptyWorkspace({ onGoToHome }: { onGoToHome: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 sm:p-10">
      <div className="mx-auto max-w-prose text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-muted text-subtle">
          <FileText size={24} strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-text sm:text-3xl">Understand a document</h1>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          Add a notice, fee letter or form first. You will get a plain-language explanation, dates and
          costs checked against the original, and a checklist of what to do next.
        </p>
        <button
          type="button"
          onClick={onGoToHome}
          className="touch-target mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-inverse hover:bg-brand-bold"
        >
          Add a document
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <p className="mt-4 text-[0.75rem] text-subtlest">
          Documents you saved earlier are available from Home.
        </p>
      </div>
    </section>
  );
}

export function Understand({
  result,
  lang: _lang,
  privacyMode,
  capability,
  online = true,
  onLangChange,
  onResultUpdate,
  onGoToHome,
  onGoToActions,
  onGoToHybridLab,
}: UnderstandProps) {
  void _lang; // reserved for future re-read on incoming doc in this language
  void online; // shown in the Hybrid Lab page
  const [tab, setTab] = useState<"explanation" | "original">("explanation");
  const [askOpen, setAskOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [qaAnswers, setQaAnswers] = useState<Array<{ question: string; answer: string; source?: "ON_DEVICE" | "IN_CLOUD" }>>([]);
  const [level, setLevel] = useState<"simple" | "standard" | "detailed">(result?.level ?? "standard");

  const evidence = useMemo(
    () =>
      result
        ? [
            ...result.deadlines.flatMap((d) => (d.evidence ? [{ label: d.label, source: d.evidence.quote }] : [])),
            ...result.costs.flatMap((c) => (c.evidence ? [{ label: c.label, source: c.evidence.quote }] : [])),
          ]
        : [],
    [result]
  );

  const fullTextForAudio = useMemo(
    () =>
      result
        ? [result.summary, ...result.actions.map((a) => a.step), ...result.documentsToBring].join(". ")
        : "",
    [result]
  );

  const handleCheckSource = useCallback((quote: string) => {
    setActiveQuote(quote);
    setTab("original");
  }, []);

  const handleQAAnswer = useCallback(
    (question: string, answer: string, source?: "ON_DEVICE" | "IN_CLOUD") => {
      setQaAnswers((prev) => [...prev.slice(-9), { question, answer, source }]);
      setAskOpen(false);
    },
    []
  );

  const handleLanguage = useCallback(
    async (code: LanguageCode) => {
      if (!result || code === result.lang || switching) return;
      setSwitching(true);
      setSwitchError(null);
      try {
        const { data, error } = await explainDocument({
          text: result.originalText,
          lang: code,
          level: result.level,
          privacyMode,
        });
        if (error || !data) {
          setSwitchError(error?.message ?? "Could not re-explain the document in that language.");
          return;
        }
        onLangChange(code);
        onResultUpdate(data);
      } catch {
        setSwitchError("Could not re-explain the document in that language.");
      } finally {
        setSwitching(false);
      }
    },
    [onLangChange, onResultUpdate, privacyMode, result, switching]
  );

  const handleLevelChange = useCallback(
    async (next: "simple" | "standard" | "detailed") => {
      if (!result || next === result.level || switching) return;
      setSwitching(true);
      setSwitchError(null);
      try {
        const { data, error } = await explainDocument({
          text: result.originalText,
          lang: result.lang,
          level: next,
          privacyMode,
        });
        if (error || !data) {
          setSwitchError(error?.message ?? "Could not simplify the document right now.");
          return;
        }
        setLevel(next);
        onResultUpdate(data);
      } catch {
        setSwitchError("Could not simplify the document right now.");
      } finally {
        setSwitching(false);
      }
    },
    [onResultUpdate, privacyMode, result, switching]
  );

  if (!result) return <EmptyWorkspace onGoToHome={onGoToHome} />;

  const dir = isRtl(result.lang) ? "rtl" : "ltr";
  const verifiedDeadlines = result.deadlines.filter((d) => d.verified).length;
  const verifiedCosts = result.costs.filter((c) => c.verified).length;
  const urgentActions = result.actions.filter((a) => a.urgent);

  const explanation = (
    <div className="space-y-4" lang={result.lang} dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[0.75rem] text-subtle">
          <span>Reading level</span>
          {[
            { value: "simple", label: "Simple" },
            { value: "standard", label: "Standard" },
            { value: "detailed", label: "Detailed" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={level === option.value}
              onClick={() => void handleLevelChange(option.value as "simple" | "standard" | "detailed")}
              disabled={switching}
              className={`touch-target rounded-md border px-2.5 py-1 text-[0.7rem] capitalize transition-colors ${
                level === option.value
                  ? "border-brand bg-brand/10 text-text"
                  : "border-input bg-background text-subtle disabled:opacity-50"
              }`}
            >
              {option.label}
            </button>
          ))}
          {switching && <span className="ml-2 text-[0.7rem] text-subtle">Rewriting…</span>}
        </label>
        <ListenButton text={fullTextForAudio} lang={result.lang} disabled={switching} />
      </div>

      <DocumentOverview result={result} />

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text">At a glance</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-background p-3">
            <dt className="text-[0.7rem] text-subtle">Deadlines</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text">
              {result.deadlines.length === 0 ? "None stated" : `${verifiedDeadlines}/${result.deadlines.length} verified`}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <dt className="text-[0.7rem] text-subtle">Costs</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text">
              {result.costs.length === 0 ? "None stated" : `${verifiedCosts}/${result.costs.length} verified`}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <dt className="text-[0.7rem] text-subtle">Actions</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text">
              {result.actions.length === 0 ? "None stated" : `${result.actions.length} to do`}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <dt className="text-[0.7rem] text-subtle">To bring</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text">
              {result.documentsToBring.length === 0 ? "None stated" : `${result.documentsToBring.length} items`}
            </dd>
          </div>
        </dl>

        {urgentActions.length > 0 && (
          <div className="mt-3 rounded-md border border-danger-border bg-danger-bg p-3" role="note">
            <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-danger">
              <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
              Time-sensitive
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text">
              {urgentActions.map((action) => (
                <li key={action.id}>{action.step}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ActionChecklist actions={result.actions} />

      <DeadlineCard deadlines={result.deadlines} onCheckSource={handleCheckSource} />
      <CostCard costs={result.costs} onCheckSource={handleCheckSource} />

      {result.eligibility.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-text">Who this applies to</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text">
            {result.eligibility.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-[0.75rem] text-subtle">
            These are the conditions written in the document. They are not a decision on your eligibility.
          </p>
        </section>
      )}

      <DocumentsCard items={result.documentsToBring} />

      {result.sections.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-text">Section by section</h2>
          <div className="space-y-3">
            {result.sections.map((section, i) => (
              <details key={i} className="rounded-md border border-border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold text-text">{section.title}</summary>
                <p className="mt-2 text-sm leading-relaxed text-text">{section.summary}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {result.glossary.length > 0 && <GlossaryCard entries={result.glossary} />}
      {result.contacts.length > 0 && <ContactsCard contacts={result.contacts} />}

      <VerificationSummary deadlines={result.deadlines} costs={result.costs} />
      <ConfidenceBanner result={result} />

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-text">Turn this into a plan</h2>
        <p className="mt-1 text-sm text-subtle">
          Tick off each step, see the dates and costs in one place, and export the checklist.
        </p>
        <button
          type="button"
          onClick={onGoToActions}
          className="touch-target mt-3 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse hover:bg-brand-bold"
        >
          <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          Open Take Action
        </button>
      </div>
    </div>
  );

  const sourceColumn = (
    <div className="space-y-4">
      <OriginalDocumentViewer
        enabled
        originalText={result.originalText}
        highlights={evidence}
        activeQuote={activeQuote}
        onActiveQuoteChange={handleCheckSource}
        defaultExpanded
      />

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
          <MessageSquare size={17} strokeWidth={2} aria-hidden="true" />
          Ask about this document
        </h2>
        <p className="mb-3 text-sm text-subtle">
          Answers use only this document. If the document does not say, the answer says so.
        </p>
        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          Ask a question
        </button>
      </section>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onGoToHome}
            className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-subtle hover:text-text"
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            Add another document
          </button>
          <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Understand this document</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[0.75rem] font-medium text-text">
              {DOC_TYPE_LABELS[result.docType] ?? result.docType}
            </span>
            <ExecutionBadge result={result} />
            {capability !== "ready" && capability !== undefined && (
              <span className="text-[0.7rem] text-subtle">
                On-device model: {capability === "checking" ? "checking…" : capability === "unavailable" ? "not available on this device" : "check failed"}
              </span>
            )}
            {onGoToHybridLab && (
              <button
                type="button"
                onClick={onGoToHybridLab}
                className="touch-target inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-[0.75rem] text-subtle hover:border-brand hover:text-brand"
              >
                Hybrid AI Lab
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.75rem] text-subtle">
          <span>Explanation language</span>
          <select
            value={result.lang}
            onChange={(event) => void handleLanguage(event.target.value as LanguageCode)}
            disabled={switching}
            className="touch-target rounded-md border border-input bg-background px-2 py-1.5 text-[0.8rem] text-text disabled:opacity-60"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
                {language.tier === "experimental" ? " (experimental)" : ""}
              </option>
            ))}
          </select>
          {switching && <span role="status">Rewriting…</span>}
        </label>
      </div>

      {switchError && (
        <div role="alert" className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger">
          {switchError}
        </div>
      )}

      {/* Mobile tabs; the two columns are always present on desktop. */}
      <div className="flex gap-1 border-b border-border lg:hidden">
        {(["explanation", "original"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === value ? "border-brand text-text" : "border-transparent text-subtle hover:text-text"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
        <div className={`${tab === "explanation" ? "block" : "hidden"} lg:block`}>{explanation}</div>
        <div className={`${tab === "original" ? "block" : "hidden"} lg:sticky lg:top-24 lg:block`}>
          {sourceColumn}
        </div>
      </div>

      <FollowUpSheet
        open={askOpen}
        onClose={() => setAskOpen(false)}
        onAnswer={handleQAAnswer}
        docContext={result.originalText}
        lang={result.lang}
      />

      {qaAnswers.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm" lang={result.lang} dir={dir}>
          <h2 className="mb-3 text-base font-semibold text-text flex items-center gap-2">
            <MessageSquare size={16} strokeWidth={2} aria-hidden="true" />
            Recent answers
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            {qaAnswers.map((item, i) => (
              <li key={i} className="rounded-md border border-border bg-background p-3">
                <p className="mb-1.5 text-subtle">Q: {item.question}</p>
                <p className="mb-1 text-text">{item.answer}</p>
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${
                    item.source === "ON_DEVICE"
                      ? "border-success-border bg-success-bg text-success-bolder"
                      : item.source === "IN_CLOUD"
                        ? "border-information bg-information-bg text-information"
                        : "border-border bg-surface-muted text-subtle"
                  }`}
                >
                  {item.source === "ON_DEVICE" ? "On device" : item.source === "IN_CLOUD" ? "In cloud" : "Demo"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
