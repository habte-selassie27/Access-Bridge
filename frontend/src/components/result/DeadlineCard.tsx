import type { Deadline } from "../../lib/api/types.ts";

export interface DeadlineCardProps {
  deadlines: Deadline[];
}

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified in source",
  unverified: "Check the original",
  partial: "Partly verified",
  relative: "Depends on another date",
  ambiguous: "Unclear in original",
};

export function DeadlineCard({ deadlines }: DeadlineCardProps) {
  if (deadlines.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Deadlines</h3>
        <p className="text-sm text-text-secondary">No deadline stated in the document.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Deadlines</h3>
      <div className="space-y-3">
        {deadlines.map((dl) => {
          const status = dl.verified ? "verified" : dl.warning ? "unverified" : "unverified";
          return (
            <div key={dl.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text-primary">{dl.label}</h4>
                  {dl.originalValue && (
                    <p className="text-xs text-text-primary mt-0.5">
                      Original: <span className="font-mono">{dl.originalValue}</span>
                    </p>
                  )}
                  {dl.normalizedDate && dl.normalizedDate !== dl.originalValue && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Normalized: <span className="font-mono">{dl.normalizedDate}</span>
                    </p>
                  )}
                  {dl.calendar && dl.calendar !== "unknown" && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Calendar: {dl.calendar.charAt(0).toUpperCase() + dl.calendar.slice(1)}
                    </p>
                  )}
                  {dl.deadlineType && dl.deadlineType !== "unknown" && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Type: {dl.deadlineType.charAt(0).toUpperCase() + dl.deadlineType.slice(1)}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  dl.verified
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/10 text-warning"
                }`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {dl.evidence && (
                <div className="mt-2 pt-2 border-t border-surface-muted">
                  <p className="text-xs text-text-secondary">Source:</p>
                  <p className="text-xs text-text-primary italic bg-surface-muted p-2 rounded">
                    “{dl.evidence.quote}”
                  </p>
                </div>
              )}
              {dl.warning && (
                <p className="mt-2 text-xs text-text-secondary">
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
