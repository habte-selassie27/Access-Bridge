import type { Cost } from "../../lib/api/types.ts";
import { StatusBadge } from "../common/StatusBadge.tsx";

export interface CostCardProps {
  costs: Cost[];
}

export function CostCard({ costs }: CostCardProps) {
  if (costs.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-text mb-3">Costs</h3>
        <p className="text-sm text-subtle">No amount stated in the document.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-text mb-4">Costs</h3>
      <div className="space-y-3">
        {costs.map((c) => {
          const amountStr = c.amount !== null ? `${c.amount}${c.currency ? " " + c.currency : ""}` : c.originalValue;
          return (
            <div key={c.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text">{c.label}</h4>
                  <p className="text-sm text-text mt-0.5 font-mono">{amountStr}</p>
                </div>
                <StatusBadge status={c.verified ? "verified" : "unverified"} />
              </div>
              {c.evidence && (
                <div className="mt-2 pt-2 border-t border-surface-muted">
                  <p className="text-[0.75rem] text-subtle">Source:</p>
                  <p className="text-sm text-text bg-surface-muted p-2 rounded">
                    “{c.evidence.quote}”
                  </p>
                </div>
              )}
              {c.warning && (
                <p className="mt-2 text-[0.75rem] text-subtle">
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
