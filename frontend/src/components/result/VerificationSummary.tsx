import type { Deadline, Cost } from "../../lib/api/types.ts";

export interface VerificationSummaryProps {
  deadlines: Deadline[];
  costs: Cost[];
}

export function VerificationSummary({ deadlines, costs }: VerificationSummaryProps) {
  const allFields = [...deadlines, ...costs];
  const verified = allFields.filter((f) => f.verified).length;
  const unverified = allFields.filter((f) => !f.verified).length;
  const total = allFields.length;

  if (total === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-text mb-3">Information checked</h3>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-text">{verified}</p>
          <p className="text-sm text-subtle">verified</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${unverified ? "text-warning" : "text-text"}`}>{unverified}</p>
          <p className="text-sm text-subtle">need checking</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-subtle">
        Dates and amounts were compared with the original document.
      </p>
    </section>
  );
}
