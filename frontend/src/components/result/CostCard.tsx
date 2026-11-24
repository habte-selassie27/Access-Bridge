import type { Cost } from "../../lib/api/types.ts";
import { StatusBadge } from "../common/StatusBadge.tsx";

export interface CostCardProps {
  costs: Cost[];
  /** Jump to and highlight this quote in the original document. */
  onCheckSource?: (quote: string) => void;
}

export function CostCard({ costs, onCheckSource }: CostCardProps) {
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
                <div className="mt-2 border-t border-surface-muted pt-2">
                  <p className="text-[0.75rem] text-subtle">Source:</p>
                  <p className="rounded bg-surface-muted p-2 text-sm text-text">“{c.evidence.quote}”</p>
                  {onCheckSource && (
                    <button
                      type="button"
                      onClick={() => onCheckSource(c.evidence!.quote)}
                      className="mt-2 text-[0.75rem] font-medium text-brand underline underline-offset-2 hover:text-brand-bold"
                    >
                      Check in original
                    </button>
                  )}
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
