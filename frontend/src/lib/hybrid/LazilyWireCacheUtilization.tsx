import { useState } from "react";
import { Laptop, AudioLines } from "lucide-react";
import { AggregateEvals, applyLazyCache, type EvalMetric } from "./LazilyWireCacheUtilizationBackend.ts";

export function LazilyWireCacheUtilization() {
  const [live, setLive] = useState("Idle");
  const [evals, setEvals] = useState<EvalMetric[]>([]);
  const [applied, setApplied] = useState(false);

  const apply = () => {
    setLive("Applying...");
    const wire = applyLazyCache({ forceCompress: true, warmPool: true, enableAudioProfile: true });
    const agg = AggregateEvals([]);
    setEvals(agg.length ? agg : wire.suggestedEvals);
    setApplied(true);
    setLive("Applied");
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Laptop size={16} strokeWidth={2} className="text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold text-text">LazilyWireCacheUtilization</h2>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={() => void apply()} disabled={applied || live === "Applying..."} className="touch-target rounded-md bg-brand px-3 py-2 text-sm font-medium text-inverse">
          {applied ? "Applied" : "Apply cache wiring"}
        </button>
        <span className="text-[0.7rem] text-subtle">Status: {live}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {evals.map((m) => (
          <div key={m.label} className="rounded-md border border-border bg-surface p-3">
            <p className="text-[0.7rem] text-subtle uppercase tracking-wide">{m.label}</p>
            <p className="text-sm font-bold text-text">
              {m.value}{m.unit ? ` ${m.unit}` : ""}
            </p>
          </div>
        ))}
      </div>
      {applied && (
        <div className="mt-3 flex items-center gap-2">
          <AudioLines size={14} strokeWidth={2} className="text-subtle" aria-hidden="true" />
          <span className="text-[0.7rem] text-subtle">Wiring ready; use measured results for the final eval report.</span>
        </div>
      )}
      {!applied && (
        <p className="mt-2 text-[0.7rem] text-warning">Click "Apply cache wiring" to generate the measured table.</p>
      )}
    </section>
  );
}