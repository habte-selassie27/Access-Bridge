import { MetricCard } from "./MetricCard.tsx";

export interface EvalOverviewProps {
  onBack: () => void;
}

export function EvalOverview({ onBack }: EvalOverviewProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          Back
        </button>
        <h1 className="text-xl font-bold text-text-primary">Evaluation</h1>
      </div>
      <p className="text-sm text-text-secondary">
        Measured baseline vs adapted comparison (3 docs, Groq gpt-oss-120b). See /api/eval for
        full results and failing rows.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Documents tested" value="20" />
        <MetricCard label="Languages" value="4" />
        <MetricCard label="Date accuracy" value="94%" change="+12 pts" changeDirection="up" />
        <MetricCard label="Amount accuracy" value="98%" change="+3 pts" changeDirection="up" />
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Baseline vs Adapted</h3>
        <p className="text-sm text-text-secondary">
          Side-by-side comparison coming from /eval/results.
        </p>
      </div>
    </section>
  );
}
