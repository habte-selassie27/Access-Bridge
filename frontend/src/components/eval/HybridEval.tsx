import { useState } from "react";
import { explainDocument } from "../../lib/api/explain.ts";
import { loadPrivacyMode } from "../../lib/privacy/storage.ts";
import { EVAL_CORPUS, type EvalDoc } from "../../lib/eval/corpus.ts";
import { median, percentile } from "../../lib/eval/stats.ts";
import { AppCheckHelp } from "../hybrid/AppCheckHelp.tsx";

/** Repeats per document, so latency percentiles have more than one sample. */
const RUNS = 3;

/**
 * Optional pause between attempts, for scripted runs against a quota-limited
 * project: `/hybrid-lab?pacing=9000`. Zero (no pause) when opened normally.
 */
const PACING_MS = (() => {
  if (typeof location === "undefined") return 0;
  const v = Number(new URLSearchParams(location.search).get("pacing") ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
})();

/** Provider rate limits are retried rather than counted as model failures. */
const MAX_RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_WAIT_MS = 25000;

interface Run {
  latencyMs?: number;
  inferenceLatencyMs?: number;
  source?: string;
  deadlines: number;
  verifiedDeadlines: number;
  costs: number;
  verifiedCosts: number;
  schemaValid: boolean;
  retries?: number;
  errorCode?: string;
  error?: string;
}

interface DocResult {
  id: string;
  category: string;
  lang: string;
  runs: Run[];
}

export function HybridEval() {
  const [results, setResults] = useState<DocResult[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setStartedAt(new Date().toISOString());
    setFinishedAt(null);
    const privacyMode = loadPrivacyMode();
    const acc: DocResult[] = [];
    for (const doc of EVAL_CORPUS) {
      setCurrent(doc.id);
      const docResult: DocResult = { id: doc.id, category: doc.category, lang: doc.lang, runs: [] };
      acc.push(docResult);
      for (let i = 0; i < RUNS; i++) {
        if (PACING_MS > 0) await new Promise((r) => setTimeout(r, PACING_MS));
        const t0 = performance.now();
        let retries = 0;
        try {
          let res = await explainDocument({ text: doc.text, lang: doc.lang, privacyMode });
          while (res.error?.code === "RATE_LIMITED" && retries < MAX_RATE_LIMIT_RETRIES) {
            retries++;
            await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS * retries));
            res = await explainDocument({ text: doc.text, lang: doc.lang, privacyMode });
          }
          const { data, error } = res;
          if (error || !data) {
            docResult.runs.push({
              deadlines: 0,
              verifiedDeadlines: 0,
              costs: 0,
              verifiedCosts: 0,
              schemaValid: false,
              retries,
              errorCode: error?.code ?? "UNKNOWN",
              error: error?.message ?? "no result",
            });
          } else {
            docResult.runs.push({
              latencyMs: Math.round(performance.now() - t0),
              inferenceLatencyMs: data.inferenceLatencyMs,
              source: data.inferenceSource ?? "unknown",
              deadlines: data.deadlines.length,
              verifiedDeadlines: data.deadlines.filter((d) => d.verified).length,
              costs: data.costs.length,
              verifiedCosts: data.costs.filter((c) => c.verified).length,
              schemaValid: true,
              retries,
            });
          }
        } catch (e) {
          docResult.runs.push({
            deadlines: 0,
            verifiedDeadlines: 0,
            costs: 0,
            verifiedCosts: 0,
            schemaValid: false,
            errorCode: "EXCEPTION",
            error: String(e),
          });
        }
        setResults([...acc.map((d) => ({ ...d, runs: [...d.runs] }))]);
      }
    }
    setCurrent(null);
    setFinishedAt(new Date().toISOString());
    setRunning(false);
  };

  const okRuns = results.flatMap((d) => d.runs).filter((r) => r.schemaValid);
  const errorRuns = results.flatMap((d) => d.runs).filter((r) => !r.schemaValid);
  const attempts = results.reduce((n, d) => n + d.runs.length, 0);
  const latencies = okRuns
    .map((r) => r.inferenceLatencyMs)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const sources = okRuns.reduce<Record<string, number>>((m, r) => {
    const k = r.source ?? "unknown";
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const errorCodes = errorRuns.reduce<Record<string, number>>((m, r) => {
    const k = r.errorCode ?? "UNKNOWN";
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const totals = okRuns.reduce(
    (t, r) => ({
      deadlines: t.deadlines + r.deadlines,
      verifiedDeadlines: t.verifiedDeadlines + r.verifiedDeadlines,
      costs: t.costs + r.costs,
      verifiedCosts: t.verifiedCosts + r.verifiedCosts,
    }),
    { deadlines: 0, verifiedDeadlines: 0, costs: 0, verifiedCosts: 0 }
  );

  const summary = {
    startedAt,
    finishedAt,
    runsPerDocument: RUNS,
    documents: EVAL_CORPUS.length,
    attempts,
    successes: okRuns.length,
    schemaValid: okRuns.length,
    errors: errorRuns.length,
    retriedAttempts: results.flatMap((d) => d.runs).filter((r) => (r.retries ?? 0) > 0).length,
    errorCodes,
    sources,
    latencyMs: {
      n: latencies.length,
      p50: median(latencies),
      p95: percentile(latencies, 95),
      min: latencies.length ? Math.min(...latencies) : null,
      max: latencies.length ? Math.max(...latencies) : null,
      note: "inference only, from the SDK call; nearest-rank percentiles",
    },
    deadlines: {
      extracted: totals.deadlines,
      verified: totals.verifiedDeadlines,
      precision: totals.deadlines ? +(totals.verifiedDeadlines / totals.deadlines).toFixed(3) : null,
    },
    costs: {
      extracted: totals.costs,
      verified: totals.verifiedCosts,
      precision: totals.costs ? +(totals.verifiedCosts / totals.costs).toFixed(3) : null,
    },
  };
  const artifact = JSON.stringify({ summary, docs: results }, null, 1);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Hybrid inference evaluation</h2>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="touch-target rounded-md bg-brand px-3 py-2 text-sm text-inverse disabled:opacity-50"
        >
          {running ? `Running${current ? ` ${current}` : ""}…` : "Run hybrid eval"}
        </button>
      </div>
      <p className="text-[0.7rem] text-subtle">
        {EVAL_CORPUS.length} authored, non-sensitive documents ({EVAL_CORPUS.map((d: EvalDoc) => d.category).join(", ")}),{" "}
        {RUNS} runs each, through the Firebase AI Logic hybrid path. Source comes from{" "}
        <code>response.inferenceSource</code>; latency is the SDK call only. On-device rows appear only on a supported
        Chrome desktop.
      </p>

      {attempts > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-[0.7rem] sm:grid-cols-4">
          <div className="rounded-md border border-border p-2">
            <dt className="text-subtle">Success</dt>
            <dd className="font-medium text-text">
              {okRuns.length}/{attempts}
            </dd>
          </div>
          <div className="rounded-md border border-border p-2">
            <dt className="text-subtle">p50 / p95</dt>
            <dd className="font-medium text-text">
              {median(latencies) ?? "—"} / {percentile(latencies, 95) ?? "—"} ms
            </dd>
          </div>
          <div className="rounded-md border border-border p-2">
            <dt className="text-subtle">Source</dt>
            <dd className="font-medium text-text">
              {Object.entries(sources)
                .map(([k, v]) => `${k} ${v}`)
                .join(", ") || "—"}
            </dd>
          </div>
          <div className="rounded-md border border-border p-2">
            <dt className="text-subtle">Verified fields</dt>
            <dd className="font-medium text-text">
              deadlines {summary.deadlines.verified}/{summary.deadlines.extracted} · costs {summary.costs.verified}/
              {summary.costs.extracted}
            </dd>
          </div>
        </dl>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[0.7rem]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-1 pr-2">Doc</th>
              <th className="py-1 pr-2">Category</th>
              <th className="py-1 pr-2">OK</th>
              <th className="py-1 pr-2">Source</th>
              <th className="py-1 pr-2">p50 latency</th>
              <th className="py-1 pr-2">Deadlines</th>
              <th className="py-1 pr-2">Verified</th>
              <th className="py-1 pr-2">Costs</th>
              <th className="py-1 pr-2">Verified</th>
            </tr>
          </thead>
          <tbody>
            {results.map((d) => {
              const ok = d.runs.filter((r) => r.schemaValid);
              const docLatency = median(
                ok.map((r) => r.inferenceLatencyMs).filter((v): v is number => typeof v === "number")
              );
              return (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium text-text">{d.id}</td>
                  <td className="py-1 pr-2">{d.category}</td>
                  <td className="py-1 pr-2">
                    {ok.length}/{d.runs.length}
                  </td>
                  <td className="py-1 pr-2">{ok[0]?.source ?? "—"}</td>
                  <td className="py-1 pr-2">{docLatency != null ? `${docLatency} ms` : "—"}</td>
                  <td className="py-1 pr-2">{ok.length ? ok[0].deadlines : "—"}</td>
                  <td className="py-1 pr-2">{ok.length ? ok[0].verifiedDeadlines : "—"}</td>
                  <td className="py-1 pr-2">{ok.length ? ok[0].costs : "—"}</td>
                  <td className="py-1 pr-2">{ok.length ? ok[0].verifiedCosts : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {errorRuns.length > 0 && (
        <div className="text-[0.7rem] text-danger">
          {Object.entries(errorCodes)
            .map(([k, v]) => `${k} ×${v}`)
            .join(", ")}
          {" — "}
          {results
            .filter((d) => d.runs.some((r) => !r.schemaValid))
            .slice(0, 3)
            .map((d) => `${d.id}: ${d.runs.find((r) => !r.schemaValid)?.error ?? ""}`)
            .join("; ")}
        </div>
      )}
      {errorRuns.some((r) => /app check/i.test(r.error ?? "") || r.errorCode === "APP_CHECK_FAILED") && <AppCheckHelp />}

      {results.length > 0 && (
        <details className="rounded-md border border-border p-2" open={running}>
          <summary className="cursor-pointer text-[0.7rem] text-subtle">
            Raw results artifact (for docs/EVALUATION.md) · {finishedAt ? `finished ${finishedAt}` : "partial run"}
          </summary>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(artifact)}
              className="rounded-md border border-border px-2 py-1 text-[0.7rem]"
            >
              Copy JSON
            </button>
          </div>
          <pre className="mt-2 max-h-64 overflow-auto text-[0.65rem] text-subtle">{artifact}</pre>
        </details>
      )}
    </div>
  );
}
