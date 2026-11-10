import type { EvalFailure, EvalResults } from "./evalTypes.ts";

const LABELS: Record<string, string> = { am: "Amharic", om: "Oromo", ti: "Tigrinya", en: "English" };

function FailureCard({ failure }: { failure: EvalFailure }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-text">
        {LABELS[failure.lang] ?? failure.lang} — {failure.seedId} ({failure.variant})
        {failure.notMeasured && (
          <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[0.7rem] font-medium text-subtle">
            not measured
          </span>
        )}
      </p>
      <p className="mb-2 text-xs text-subtle">{failure.reasons.join("; ")}</p>
      {failure.summary && <p className="text-xs text-subtle">{failure.summary}</p>}
      {failure.error && <p className="text-xs text-danger">{failure.error}</p>}
    </article>
  );
}

export function FailureCases({ data }: { data: EvalResults | null }) {
  const failures = data?.failures ?? [];
  const scored = failures.filter((f) => !f.notMeasured);
  const notMeasured = failures.filter((f) => f.notMeasured);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Model failures</h2>
        <p className="mt-1 text-sm text-subtle">
          We publish misses, not just wins. These rows produced an explanation that failed schema
          validation, contained unverified dates or amounts, or used the wrong script.
        </p>
      </div>
      <div className="space-y-3">
        {scored.length ? (
          scored.slice(0, 25).map((f, i) => (
            <FailureCard key={`${f.seedId}-${f.lang}-${f.variant}-${i}`} failure={f} />
          ))
        ) : (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            No model failures recorded in the measured run.
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold text-text">Not measured: provider errors</h2>
        <p className="mt-1 text-sm text-subtle">
          The provider returned rate-limit or network errors for {notMeasured.length} row(s). No
          explanation was produced, so these are excluded from the accuracy percentages rather than
          counted as model failures. They are still listed here so the run is auditable.
        </p>
        <div className="mt-3 space-y-3">
          {notMeasured.length ? (
            notMeasured.slice(0, 25).map((f, i) => (
              <FailureCard key={`${f.seedId}-${f.lang}-${f.variant}-nm-${i}`} failure={f} />
            ))
          ) : (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
              No provider errors in the measured run.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
