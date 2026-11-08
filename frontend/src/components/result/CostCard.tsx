import type { Cost } from "../../lib/api/types.ts";

export interface CostCardProps {
  costs: Cost[];
}

export function CostCard({ costs }: CostCardProps) {
  if (costs.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Costs</h3>
        <p className="text-sm text-text-secondary">No amount stated in the document.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Costs</h3>
      <div className="space-y-3">
        {costs.map((c) => {
          const amountStr = c.amount !== null ? `${c.amount}${c.currency ? " " + c.currency : ""}` : c.originalValue;
          return (
            <div key={c.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text-primary">{c.label}</h4>
                  <p className="text-sm text-text-primary mt-0.5 font-mono">{amountStr}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  c.verified
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/10 text-warning"
                }`}>
                  {c.verified ? "Verified in source" : "Check the original"}
                </span>
              </div>
              {c.evidence && (
                <div className="mt-2 pt-2 border-t border-surface-muted">
                  <p className="text-xs text-text-secondary">Source:</p>
                  <p className="text-xs text-text-primary italic bg-surface-muted p-2 rounded">
                    “{c.evidence.quote}”
                  </p>
                </div>
              )}
              {c.warning && (
                <p className="mt-2 text-xs text-text-secondary">
                  {c.warning}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
