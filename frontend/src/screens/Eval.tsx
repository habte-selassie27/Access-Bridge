import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { EvalOverview } from "../components/eval/EvalOverview.tsx";
import { LanguageComparison } from "../components/eval/LanguageComparison.tsx";
import { SampleComparison } from "../components/eval/SampleComparison.tsx";
import { FailureCases } from "../components/eval/FailureCases.tsx";
import type { EvalResults } from "../components/eval/evalTypes.ts";
import { fetchAPI } from "../lib/api/client.ts";
import { useMachine, evalReducer, initialEvalState } from "../lib/state/index.ts";

export interface EvalProps {
  onBack: () => void;
}

export function Eval({ onBack }: EvalProps) {
  const [ev, send] = useMachine(evalReducer, initialEvalState);
  const view = ev.view as "overview" | "languages" | "samples" | "failures";
  const data = ev.data as EvalResults | null;
  const loading = ev.status === "loading";
  const error = ev.status === "error" ? ev.error : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      send({ type: "LOAD" });
      const rendered = await fetchAPI<EvalResults>("/api/eval", {});
      if (cancelled) return;
      if (rendered.error) send({ type: "FAILED", error: rendered.error.message });
      else send({ type: "LOADED", data: rendered.data ?? null });
    })();
    return () => {
      cancelled = true;
    };
  }, [send]);

  return (
    <section className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text">Evaluation</h1>
        <p className="text-sm text-subtle">Baseline vs adapted results across languages.</p>
      </div>

      {loading && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-subtle">
          Loading measured results…
        </div>
      )}

      {!loading && data && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text">
          <span className="font-medium text-success">Measured results</span> from a real run on{" "}
          {new Date(data.generatedAt).toLocaleString()} ({data.model}). Adaption dataset{" "}
          <span className="font-mono text-xs">{data.datasetId}</span>; {data.failures?.length ?? 0} failure
          row(s) published under Failures.
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-danger">
          Could not load evaluation results: {error}
        </div>
      )}

      <nav aria-label="Evaluation views" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["overview", "Overview"],
          ["languages", "Languages"],
          ["samples", "Samples"],
          ["failures", "Failures"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => send({ type: "VIEW", view: key as typeof view })}
            aria-pressed={view === key}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              view === key
                ? "border-brand bg-brand text-inverse"
                : "border-border bg-surface text-subtle hover:bg-neutral-subtle-hovered"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {!loading && view === "overview" && <EvalOverview data={data} />}
      {!loading && view === "languages" && <LanguageComparison data={data} />}
      {!loading && view === "samples" && <SampleComparison data={data} />}
      {!loading && view === "failures" && <FailureCases data={data} />}
    </section>
  );
}
