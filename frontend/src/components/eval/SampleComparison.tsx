import type { EvalResults } from "./evalTypes.ts";

export function SampleComparison({ data }: { data: EvalResults | null }) {
  const rows = data?.rows ?? [];
  const sample = rows.find((r) => r.lang === "am" && r.variant === "baseline");
  const adapted = sample
    ? rows.find((r) => r.lang === "am" && r.variant === "adapted" && r.seedId === sample.seedId)
    : undefined;

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-text mb-4">Amharic example{sample ? ` — ${sample.seedId}` : ""}</h2>
      {sample ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-danger-border/20 bg-danger-bg/5 p-4">
            <p className="text-xs text-danger font-medium mb-2">Baseline</p>
            <p className="text-sm text-text font-ethiopic">{sample.rawSummary || "(no summary)"}</p>
          </div>
          <div className="rounded-lg border border-success-border/20 bg-success-bg/5 p-4">
            <p className="text-xs text-success font-medium mb-2">Adapted</p>
            <p className="text-sm text-text font-ethiopic">{adapted?.rawSummary || "(no summary)"}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-subtle">No measured sample available yet.</p>
      )}
    </section>
  );
}
