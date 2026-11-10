import { ArrowRight, Compass } from "lucide-react";
import type { ExplanationResult } from "../../lib/api/types.ts";
import { buildNextSteps } from "../../lib/recommendations.ts";

export interface NextStepsCardProps {
  result: ExplanationResult;
}

const PRIORITY_LABEL: Record<string, string> = {
  high: "Do first",
  medium: "Then",
  low: "Also",
};

export function NextStepsCard({ result }: NextStepsCardProps) {
  const steps = buildNextSteps(result);
  if (steps.length === 0) return null;

  return (
    <section className="rounded-lg border border-brand bg-selected p-4">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-text">
        <Compass size={19} strokeWidth={2} aria-hidden="true" />
        Your next steps
      </h3>
      <p className="mb-3 text-[0.8rem] text-subtle">
        Built from this document and what is still unchecked. Nothing added from anywhere else.
      </p>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[0.7rem] font-semibold text-inverse">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text">
                {step.title}
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                    step.priority === "high"
                      ? "bg-danger-bg text-danger"
                      : step.priority === "medium"
                        ? "bg-warning-bg text-warning"
                        : "bg-surface-muted text-subtle"
                  }`}
                >
                  {PRIORITY_LABEL[step.priority]}
                </span>
              </p>
              <p className="mt-0.5 text-[0.8rem] text-subtle">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex items-center gap-1 text-[0.75rem] text-subtle">
        <ArrowRight size={12} aria-hidden="true" />
        Tick items off in Actions as you finish them.
      </p>
    </section>
  );
}
