import { ShieldCheck } from "lucide-react";
import type { ExplanationResult } from "../../lib/api/types.ts";

const DOC_TYPE_LABELS: Record<string, string> = {
  government_notice: "Government notice",
  medical: "Medical document",
  financial: "Financial document",
  school: "School document",
  other: "Other document",
};

export interface DocumentOverviewProps {
  result: ExplanationResult;
}

export function DocumentOverview({ result }: DocumentOverviewProps) {
  const label = DOC_TYPE_LABELS[result.docType] || result.docType;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} strokeWidth={2} className="text-accent" />
          <h3 className="text-lg font-semibold text-text-primary">What this document says</h3>
        </div>
        <span className="touch-target rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-primary">
          {label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-text-primary text-lg leading-relaxed">
          {result.summary}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-muted">
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Source language</p>
            <p className="text-sm font-medium text-text-primary">{result.originalLanguage.toUpperCase()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Explanation language</p>
            <p className="text-sm font-medium text-text-primary">{result.lang.toUpperCase()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Confidence</p>
            <p className={`text-sm font-medium ${result.confidence === "high" ? "text-success" : result.confidence === "medium" ? "text-warning" : "text-danger"}`}>
              {result.confidence}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Warnings</p>
            <p className="text-sm font-medium text-text-primary">{result.warnings.length}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
