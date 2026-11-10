import { ShieldCheck } from "lucide-react";
import type { ExplanationResult } from "../../lib/api/types.ts";
import { languageName } from "../../lib/languages.ts";

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
  other: "Other document",
};

export interface DocumentOverviewProps {
  result: ExplanationResult;
}

export function DocumentOverview({ result }: DocumentOverviewProps) {
  const label = DOC_TYPE_LABELS[result.docType] || result.docType;

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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-4 border-t border-surface-muted">
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Source language</p>
            <p className="text-sm font-medium text-text">{languageName(result.originalLanguage)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-subtle mb-0.5">Explanation language</p>
            <p className="text-sm font-medium text-text">{languageName(result.lang)}</p>
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
      </div>
    </section>
  );
}
