import { BarChart3 } from "lucide-react";
import { MetricCard } from "./MetricCard.tsx";
import type { EvalResults } from "./evalTypes.ts";

function avg(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number");
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
}

function pct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function deltaText(a: number | null, b: number | null): { text?: string; direction?: "up" | "down" } {
  if (a == null || b == null) return {};
  const d = Math.round((a - b) * 100);
  if (d === 0) return { text: "±0 pts", direction: "up" };
  return { text: `${d > 0 ? "+" : ""}${d} pts`, direction: d > 0 ? "up" : "down" };
}

export function EvalOverview({ data }: { data: EvalResults | null }) {
  const languages = Object.values(data?.languages ?? {});
  const dateAdapted = avg(languages.map((l) => l.adapted?.dateAccuracy ?? null));
  const dateBaseline = avg(languages.map((l) => l.baseline?.dateAccuracy ?? null));
  const amountAdapted = avg(languages.map((l) => l.adapted?.amountAccuracy ?? null));
  const amountBaseline = avg(languages.map((l) => l.baseline?.amountAccuracy ?? null));
  const verifiedAdapted = avg(languages.map((l) => l.adapted?.verifiedRate ?? null));
  const hallucinated = languages.reduce((n, l) => n + (l.adapted?.hallucinatedFields ?? 0), 0);
  const dateDelta = deltaText(dateAdapted, dateBaseline);
  const amountDelta = deltaText(amountAdapted, amountBaseline);
  const totalRows = data?.rows?.length ?? 0;
  const notMeasured = data?.providerErrors ?? 0;
  const measuredRows = data?.measuredRows ?? Math.max(0, totalRows - notMeasured);
  const measuredLabel = totalRows ? `${measuredRows}/${totalRows}` : "—";

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <BarChart3 size={20} strokeWidth={2} className="text-subtle" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">No measured results yet</h2>
            <p className="mt-1 text-sm text-subtle">
              Evaluation runs offline against held-out documents, comparing baseline prompts with
              per-language prompts adapted from an Adaption dataset. Results are only published when a
              real run exists — this page never shows simulated numbers.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-[0.75rem] text-subtle">Date accuracy</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Baseline vs adapted</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-subtle">Amount accuracy</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Baseline vs adapted</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-subtle">Field verification</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">Checked against the source</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-subtle">
        Measured on {data.heldOutSeeds.length} held-out documents ({data.model}). Adaption dataset {data.datasetId},
        built {new Date(data.datasetBuiltAt).toLocaleDateString()} UTC.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Documents tested" value={String(data.heldOutSeeds.length)} />
        <MetricCard label="Languages" value={String(Object.keys(data.languages).length)} />
        <MetricCard label="Rows scored" value={measuredLabel} />
        <MetricCard label="Date accuracy" value={pct(dateAdapted)} change={dateDelta.text} changeDirection={dateDelta.direction} />
        <MetricCard label="Amount accuracy" value={pct(amountAdapted)} change={amountDelta.text} changeDirection={amountDelta.direction} />
        <MetricCard label="Verified fields" value={pct(verifiedAdapted)} />
        <MetricCard label="Unverified fields (adapted)" value={String(hallucinated)} />
      </div>
      {notMeasured > 0 && (
        <p className="text-sm text-subtle">
          {notMeasured} of {totalRows} row(s) were not scored: the provider returned rate-limit or network
          errors, so no explanation was produced. They are listed under Failures as “not measured” and
          excluded from every percentage above instead of being counted as wrong answers.
        </p>
      )}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-text mb-3">Baseline vs Adapted</h2>
        <p className="text-sm text-subtle">
          Adapted prompts use per-language examples translated by Adaption from the English seed corpus. Every date
          and amount is checked against the source document by deterministic code.
        </p>
        <p className="mt-2 text-sm text-subtle">
          Only the languages listed here have measured numbers. The app also supports Swahili, Arabic and
          French, but those are marked as experimental until they are evaluated the same way — no number on
          this page covers them yet.
        </p>
      </div>
    </section>
  );
}
