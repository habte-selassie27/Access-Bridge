import { useState } from "react";
import { EvalOverview } from "../components/eval/EvalOverview.tsx";
import { LanguageComparison } from "../components/eval/LanguageComparison.tsx";
import { SampleComparison } from "../components/eval/SampleComparison.tsx";
import { FailureCases } from "../components/eval/FailureCases.tsx";

export interface EvalProps {
  onBack: () => void;
}

export function Eval({ onBack }: EvalProps) {
  const [view, setView] = useState<"overview" | "languages" | "samples" | "failures">("overview");

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
        <div>
          <h1 className="text-xl font-bold text-text-primary">Evaluation dashboard</h1>
          <p className="text-sm text-text-secondary">Baseline vs adapted results across languages.</p>
        </div>
      </div>

      <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
        Measured results from scripts/run-eval.mjs (Groq gpt-oss-120b, 3 docs). Headline: 0
        hallucinated numbers across both variants. See /api/eval for full data and failing rows.
      </div>

      <div className="flex gap-2 border-b border-surface-muted pb-2">
        {["overview", "languages", "samples", "failures"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v as any)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              view === v
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border bg-background text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view === "overview" && <EvalOverview onBack={onBack} />}
      {view === "languages" && <LanguageComparison onBack={onBack} />}
      {view === "samples" && <SampleComparison onBack={onBack} />}
      {view === "failures" && <FailureCases onBack={onBack} />}
    </section>
  );
}
