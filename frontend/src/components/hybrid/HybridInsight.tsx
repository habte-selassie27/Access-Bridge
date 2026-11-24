import { useState } from "react";
import type { ExplanationResult } from "../../lib/api/types.ts";

export interface HybridInsightProps {
  result: ExplanationResult;
  privacyMode?: string;
  verifiedDeadlines?: number;
  verifiedCosts?: number;
}

export function HybridInsight({ result, privacyMode, verifiedDeadlines, verifiedCosts }: HybridInsightProps) {
  const [open, setOpen] = useState(false);
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[0.7rem] text-subtle underline hover:text-text"
      >
        Hybrid insight
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">Hybrid insight</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-subtle hover:text-text">✕</button>
            </div>
            <dl className="space-y-2 text-[0.75rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Actual inference source</dt>
                <dd className="font-medium text-text">{result.inferenceSource ?? "Bundled demo"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Privacy mode</dt>
                <dd className="font-medium text-text">{privacyMode ?? "smart"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Inference latency</dt>
                <dd className="font-medium text-text">{result.inferenceLatencyMs ? `${result.inferenceLatencyMs} ms` : "n/a"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Connectivity</dt>
                <dd className="font-medium text-text">{online ? "online" : "offline"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Verified deadlines</dt>
                <dd className="font-medium text-text">{verifiedDeadlines ?? result.deadlines.filter((d) => d.verified).length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Verified costs</dt>
                <dd className="font-medium text-text">{verifiedCosts ?? result.costs.filter((c) => c.verified).length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Language</dt>
                <dd className="font-medium text-text">{result.lang}</dd>
              </div>
            </dl>
            <p className="text-[0.65rem] text-subtle">No document text is included in this telemetry.</p>
          </div>
        </div>
      )}
    </>
  );
}