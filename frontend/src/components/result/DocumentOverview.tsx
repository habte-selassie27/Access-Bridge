import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ExplanationResult } from "../../lib/api/types.ts";
import { languageName, languageTier } from "../../lib/languages.ts";

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

const QUALITY_LABELS: Record<string, string> = {
  source: "Source language — no translation",
  measured: "Measured — see evaluation",
  experimental: "Experimental — not yet measured",
};

export interface DocumentOverviewProps {
  result: ExplanationResult;
}

export function DocumentOverview({ result }: DocumentOverviewProps) {
  const label = DOC_TYPE_LABELS[result.docType] || result.docType;
  // The server stamps each result with the quality of its own target
  // language; the global tier is only a fallback for older saved results.
  const quality = result.languageQuality ?? languageTier(result.lang);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck size={20} strokeWidth={2} className="text-brand" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-text">What this document says</h3>
        </div>
        <span className="shrink-0 rounded-full border border-input px-2.5 py-0.5 text-[0.75rem] font-medium text-text">
          {label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-text text-lg leading-relaxed">
          {result.summary}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-surface-muted pt-4 sm:grid-cols-5">
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Source language</p>
            <p className="text-sm font-medium text-text">{languageName(result.originalLanguage)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Explanation language</p>
            <p className="text-sm font-medium text-text">{languageName(result.lang)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Translation quality</p>
            <p
              className={`text-sm font-medium ${
                quality === "experimental" ? "text-warning" : quality === "measured" ? "text-success" : "text-text"
              }`}
            >
              {QUALITY_LABELS[quality]}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Confidence</p>
            <p className={`text-sm font-medium ${result.confidence === "high" ? "text-success" : result.confidence === "medium" ? "text-warning" : "text-danger"}`}>
              {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Warnings</p>
            <p className="text-sm font-medium text-text">{result.warnings.length}</p>
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div className="rounded-md border border-warning-border bg-warning-bg p-3" role="note">
            <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-warning">
              <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
              Important warnings
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
