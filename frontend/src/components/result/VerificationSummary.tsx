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
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-3">Information checked</h3>
      <div className="flex items-center justify-between gap-4 text-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">{verified}</p>
          <p className="text-xs text-text-secondary uppercase tracking-wider">verified</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">{unverified}</p>
          <p className="text-xs text-text-secondary uppercase tracking-wider">needs checking</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-secondary">
        Dates and amounts were compared with the original document.
      </p>
    </section>
  );
}
