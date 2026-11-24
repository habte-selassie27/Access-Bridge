import type { Deadline } from "../../lib/api/types.ts";
import { StatusBadge } from "../common/StatusBadge.tsx";

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface DeadlineCardProps {
  deadlines: Deadline[];
  /** Jump to and highlight this quote in the original document. */
  onCheckSource?: (quote: string) => void;
}

export function DeadlineCard({ deadlines, onCheckSource }: DeadlineCardProps) {
  if (deadlines.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-text mb-3">Deadlines</h3>
        <p className="text-sm text-subtle">No deadline stated in the document.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-text mb-4">Deadlines</h3>
      <div className="space-y-3">
        {deadlines.map((dl) => {
          return (
            <div key={dl.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text">{dl.label}</h4>
                  {dl.originalValue && (
                    <p className="text-sm text-text mt-0.5">
                      Original: <span className="font-mono">{dl.originalValue}</span>
                    </p>
                  )}
                  {dl.normalizedDate && dl.normalizedDate !== dl.originalValue && (
                    <p className="text-sm text-subtle mt-0.5">
                      Normalized: <span className="font-mono">{dl.normalizedDate}</span>
                    </p>
                  )}
                  {dl.calendar && dl.calendar !== "unknown" && (
                    <p className="text-[0.75rem] text-subtle mt-0.5">
                      Calendar: {capitalise(dl.calendar)}
                    </p>
                  )}
                  {dl.deadlineType && dl.deadlineType !== "unknown" && (
                    <p className="text-[0.75rem] text-subtle mt-0.5">
                      Type: {capitalise(dl.deadlineType)}
                    </p>
                  )}
                </div>
                <StatusBadge status={dl.verified ? "verified" : "unverified"} />
              </div>
              {dl.evidence && (
                <div className="mt-2 border-t border-surface-muted pt-2">
                  <p className="text-[0.75rem] text-subtle">Source:</p>
                  <p className="rounded bg-surface-muted p-2 text-sm text-text">“{dl.evidence.quote}”</p>
                  {onCheckSource && (
                    <button
                      type="button"
                      onClick={() => onCheckSource(dl.evidence!.quote)}
                      className="mt-2 text-[0.75rem] font-medium text-brand underline underline-offset-2 hover:text-brand-bold"
                    >
                      Check in original
                    </button>
                  )}
                </div>
              )}
              {dl.warning && (
                <p className="mt-2 text-[0.75rem] text-subtle">
                  {dl.warning}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
