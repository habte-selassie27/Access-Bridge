import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Laptop, Play, Clock } from "lucide-react";
import {
  getDeviceModelAvailability,
  isHybridConfigured,
  isHybridReady,
} from "../lib/hybrid/index.ts";
import { loadConsent, grantConsent, revokeConsent } from "../lib/privacy/consent.ts";
import { planRoute, type PrivacyMode } from "../lib/privacy/modes.ts";
import { loadPrivacyMode, savePrivacyMode } from "../lib/privacy/storage.ts";
import { HybridEval } from "../components/eval/HybridEval.tsx";
import { LocalInferenceTest } from "../components/hybrid/LocalInferenceTest.tsx";

export interface HybridLabProps {
  result: { inferenceSource?: string; inferenceLatencyMs?: number } | null;
  onBack: () => void;
}

export function HybridLab({ result, onBack }: HybridLabProps) {
  const [avail, setAvail] = useState<string>("checking");
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [configured, setConfigured] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() => loadPrivacyMode());
  const [consent, setConsent] = useState(() => loadConsent());
  const [metrics, setMetrics] = useState<{ local: number; cloud: number; denied: number; runs: number }>({
    local: 0,
    cloud: 0,
    denied: 0,
    runs: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConfigured(isHybridConfigured());
      setReady(isHybridReady());
      const a = await getDeviceModelAvailability();
      if (!cancelled) setAvail(a);
    })();
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const plan = planRoute({ mode: privacyMode, consented: consent.cloudConsented, deviceAvailable: avail === "available", online });
  const blockText = plan.allowed ? "Allowed" : `Blocked: ${plan.reason}`;

  const handleGrant = () => {
    const next = grantConsent();
    setConsent(next);
  };

  const handleRevoke = () => {
    const next = revokeConsent();
    setConsent(next);
    setPrivacyMode("private");
    savePrivacyMode("private");
  };

  const recordSource = useCallback((source: "ON_DEVICE" | "IN_CLOUD") => {
    setMetrics((m) => ({
      ...m,
      runs: m.runs + 1,
      [source === "ON_DEVICE" ? "local" : "cloud"]: (m[source === "ON_DEVICE" ? "local" : "cloud"] as number) + 1,
    }));
  }, []);

  useEffect(() => {
    if (result?.inferenceSource === "ON_DEVICE") recordSource("ON_DEVICE");
    else if (result?.inferenceSource === "IN_CLOUD") recordSource("IN_CLOUD");
  }, [result, recordSource]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">Hybrid AI Lab</h1>
          <p className="text-sm text-subtle">Real runtime diagnostics: where inference ran, how long it took, and whether cloud consent was used.</p>
        </div>
      </div>

      {/* 1. Device capability panel */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <Laptop size={16} strokeWidth={2} aria-hidden="true" /> Device capability
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Firebase configured</dt>
            <dd className={`font-medium text-text ${configured ? "text-success" : "text-danger"}`}>
              {configured ? "Yes" : "No — set VITE_FIREBASE_* env vars"}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">SDK ready</dt>
            <dd className={`font-medium text-text ${ready ? "text-success" : "text-muted"}`}>{ready ? "Yes" : "No"}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">On-device model</dt>
            <dd className={`font-medium text-text ${avail === "available" ? "text-success" : avail === "unavailable" ? "text-warning" : "text-muted"}`}>
              {avail === "available" ? "Available" : avail === "downloadable" ? "Downloadable" : avail === "downloading" ? "Downloading…" : "Unavailable"}
            </dd>
            <p className="mt-1 text-[0.7rem] text-subtle">Chrome 139+ desktop only.</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Network</dt>
            <dd className={`font-medium text-text ${online ? "text-success" : "text-danger"}`}>
              {online ? "Online" : "Offline"}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Cloud consent</dt>
            <dd className={`font-medium text-text ${consent.cloudConsented ? "text-success" : "text-muted"}`}>
              {consent.cloudConsented ? "Granted" : "Not granted"}
            </dd>
            {consent.cloudConsented ? (
              <button type="button" onClick={handleRevoke} className="mt-1 text-[0.7rem] text-subtle underline hover:text-text">
                Revoke
              </button>
            ) : (
              <button type="button" onClick={handleGrant} className="mt-1 touch-target rounded-md border border-input bg-background px-2 py-1 text-[0.7rem] text-text">
                Grant consent
              </button>
            )}
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Privacy mode</dt>
            <dd className="font-medium text-text">{privacyMode === "private" ? "Private device only" : privacyMode === "cloud" ? "Cloud" : "Smart hybrid"}</dd>
            <div className="mt-1 text-[0.7rem] text-subtle">{blockText}</div>
          </div>
        </dl>
      </section>

      {/* 2. Last execution trace */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <Clock size={16} strokeWidth={2} aria-hidden="true" /> Last execution trace
        </h2>
        {!result ? (
          <p className="text-sm text-subtle">No inference has run yet. Run a document on Home or the hybrid eval below.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-surface p-3">
              <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Requested mode</dt>
              <dd className="font-medium text-text">{privacyMode === "private" ? "Private device only" : privacyMode === "cloud" ? "Cloud" : "Smart hybrid"}</dd>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Actual source</dt>
              <dd className={`font-medium text-text ${result.inferenceSource === "ON_DEVICE" ? "text-success" : result.inferenceSource === "IN_CLOUD" ? "text-info" : "text-muted"}`}>
                {result.inferenceSource === "ON_DEVICE" ? "On device" : result.inferenceSource === "IN_CLOUD" ? "In cloud" : "Not run"}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Latency</dt>
              <dd className="font-medium text-text">{result.inferenceLatencyMs ? `${result.inferenceLatencyMs} ms` : "n/a"}</dd>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Cloud transfer</dt>
              <dd className="font-medium text-text">{consent.cloudConsented ? "Allowed" : "Blocked"}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* 3. Session metrics */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <Clock size={16} strokeWidth={2} aria-hidden="true" /> Session metrics
        </h2>
        <p className="text-[0.7rem] text-subtle mb-3">Counts are session-scoped only; no document text is stored.</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Total runs</dt>
            <dd className="font-medium text-text">{metrics.runs}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">On device</dt>
            <dd className="font-medium text-text">{metrics.local}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">In cloud</dt>
            <dd className="font-medium text-text">{metrics.cloud}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <dt className="text-[0.7rem] text-subtle uppercase tracking-wide">Denied transfers</dt>
            <dd className="font-medium text-text">{metrics.denied}</dd>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMetrics({ local: 0, cloud: 0, denied: 0, runs: 0 })}
          className="mt-3 text-[0.7rem] text-subtle underline hover:text-text"
        >
          Clear session metrics
        </button>
      </section>

      {/* 4. On-device verification test (strict local, no fallback) */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
          <Laptop size={16} strokeWidth={2} aria-hidden="true" /> On-device test
        </h2>
        <p className="mb-3 text-[0.7rem] text-subtle">
          Runs a short authored prompt with the SDK set to only-on-device. The reported source is the SDK's
          result, never the requested mode. Use it online first, then repeat with the network offline.
        </p>
        <LocalInferenceTest onResult={recordSource} />
      </section>

      {/* 5. Real inference runs (side-by-side via authored samples) */}
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
          <Play size={16} strokeWidth={2} aria-hidden="true" /> Run hybrid inference on authored samples
        </h2>
        <p className="text-[0.7rem] text-subtle mb-3">
          Runs real Firebase AI Logic hybrid inference. The actual source (on-device vs cloud) is reported by the SDK,
          not assumed. Unavailable modes show "not run".
        </p>
        <HybridEval />
      </section>
    </section>
  );
}
