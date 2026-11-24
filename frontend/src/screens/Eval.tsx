import { useState, useEffect } from "react";
import { ArrowLeft, Cloud, History as HistoryIcon } from "lucide-react";
import { EvalOverview } from "../components/eval/EvalOverview.tsx";
import { HybridEval } from "../components/eval/HybridEval.tsx";
import type { EvalResults } from "../components/eval/evalTypes.ts";
import { fetchAPI } from "../lib/api/client.ts";

export interface EvalProps {
  onBack: () => void;
}

export function Eval({ onBack }: EvalProps) {
  const [data, setData] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const rendered = await fetchAPI<EvalResults>("/api/eval", {});
      if (cancelled) return;
      if (rendered.error) {
        setError(rendered.error.message);
        setData(null);
      } else {
        setData(rendered.data ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
        <div className="min-w-0 text-right sm:text-left">
          <h1 className="text-2xl font-bold text-text sm:text-3xl">AI Evaluation</h1>
          <p className="text-sm text-subtle">
            Live Firebase AI Logic measurements come first. The earlier Adaption baseline is labelled
            historical and never mixed into these numbers.
          </p>
        </div>
      </div>

      {/* Live hybrid evaluation (Firebase AI Logic) — current measurements. */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <Cloud size={18} strokeWidth={2} className="text-brand" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-text">Hybrid evaluation (Firebase AI Logic — live)</h2>
              <span className="rounded border border-success-border bg-success-bg px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-success-bolder">
                live
              </span>
            </div>
            <p className="mt-1 text-sm text-subtle">
              Runs authored documents through the real Firebase AI Logic hybrid path and reports the actual
              inference source (on-device vs cloud), latency, schema validity and verified-field counts.
              Unavailable paths show “not run” rather than invented output.
            </p>
          </div>
        </div>
        <HybridEval />
      </section>

      {/* Historical baseline (Adaption) — clearly separated from hybrid. */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <HistoryIcon size={18} strokeWidth={2} className="text-subtle" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-text">Historical baseline (Adaption — prior work)</h2>
              <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-subtle">
                historical
              </span>
            </div>
            <p className="mt-1 text-sm text-subtle">
              These numbers come from the previous Adaption-themed evaluation. They are not Firebase hybrid
              results and are shown only for reference.
            </p>
          </div>
        </div>
        {loading && (
          <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-subtle">
            Loading measured results…
          </div>
        )}
        {!loading && data && <EvalOverview data={data} />}
        {!loading && error && (
          <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-danger">
            Could not load historical evaluation results: {error}
          </div>
        )}
      </section>
    </section>
  );
}
