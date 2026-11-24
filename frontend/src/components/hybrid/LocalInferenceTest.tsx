import { useState } from "react";
import { Laptop, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  getDeviceModelAvailability,
  getHybridModel,
  initializeDeviceModel,
  isHybridConfigured,
  isHybridReady,
  hybridGenerateText,
  getLastHybridError,
} from "../../lib/hybrid/index.ts";
import { AppCheckHelp } from "./AppCheckHelp.tsx";

interface Outcome {
  source: "ON_DEVICE" | "IN_CLOUD";
  latencyMs: number;
  preview: string;
}

/**
 * On-device verification test (AGENTS.md Gate C, UI.md §7.5).
 *
 * This is deliberately a one-click, authored prompt with NO cloud fallback:
 * the SDK mode is ONLY_ON_DEVICE. Success is reported only when the SDK says
 * the request ran on-device. A cached demo or an assumed route is not counted.
 *
 * The test is meaningful in two states:
 *   1. online, after the model is prepared — proves real local inference;
 *   2. offline (DevTools → Network → Offline), after step 1 — proves offline
 *      local inference, because the cloud path is unreachable.
 */
export function LocalInferenceTest({
  onResult,
}: {
  onResult?: (source: "ON_DEVICE" | "IN_CLOUD") => void;
}) {
  const [status, setStatus] = useState<"idle" | "preparing" | "running">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const configured = isHybridConfigured();
  const ready = isHybridReady();

  const run = async () => {
    setError(null);
    setErrorCode(null);
    setOutcome(null);
    const model = getHybridModel({ mode: "only_on_device" });
    if (!model) {
      setError("Firebase AI Logic is not configured. Add the VITE_FIREBASE_* values and rebuild.");
      return;
    }

    setStatus("preparing");
    setProgress(0);
    try {
      await initializeDeviceModel(model, (pct) => setProgress(pct));
    } catch {
      // initializeDeviceModel already reports failures; continue to the real call.
    }

    setStatus("running");
    const availability = await getDeviceModelAvailability();
    const result = await hybridGenerateText({
      prompt: "In one sentence, explain what a deadline is.",
      systemInstruction: "Answer in one short sentence. Do not add extra commentary.",
      sdkMode: "ONLY_ON_DEVICE",
      onProgress: (pct) => setProgress(pct),
    });

    setStatus("idle");
    setProgress(null);

    if (!result) {
      const sdk = getLastHybridError();
      setErrorCode(sdk?.code ?? null);
      setError(
        sdk?.message ??
          (availability === "available"
            ? "The on-device call did not return a result. Check the browser console for an SDK error and retry."
            : `No on-device model is available in this browser (reported: ${availability}). Use Chrome 139+ on a supported desktop.`)
      );
      return;
    }

    setOutcome({
      source: result.source,
      latencyMs: result.latencyMs,
      preview: result.text.trim().slice(0, 240),
    });
    onResult?.(result.source);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={status !== "idle"}
          className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-inverse disabled:opacity-60"
        >
          <Play size={15} strokeWidth={2} aria-hidden="true" />
          {status === "preparing"
            ? `Preparing model… ${progress ?? 0}%`
            : status === "running"
              ? "Running on device…"
              : "Run on-device test"}
        </button>
        <span className="text-[0.7rem] text-subtle">
          Strict on-device mode, no cloud fallback. {configured ? (ready ? "Firebase SDK ready." : "Firebase configured, SDK not initialised yet.") : "Firebase not configured."}
        </span>
      </div>

      {outcome && (
        <div
          className={`rounded-md border p-3 text-sm ${
            outcome.source === "ON_DEVICE"
              ? "border-success-border bg-success-bg text-success-bolder"
              : "border-warning-border bg-warning-bg text-warning-bolder"
          }`}
          role="status"
        >
          <p className="flex items-center gap-2 font-semibold">
            {outcome.source === "ON_DEVICE" ? (
              <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            )}
            {outcome.source === "ON_DEVICE"
              ? `Ran on this device in ${outcome.latencyMs} ms`
              : `SDK reported cloud execution (${outcome.latencyMs} ms) — not an on-device pass`}
          </p>
          {outcome.preview && (
            <p className="mt-1 break-words text-[0.8rem] text-text">“{outcome.preview}”</p>
          )}
          {outcome.source === "ON_DEVICE" && (
            <p className="mt-2 text-[0.75rem] text-text">
              To prove offline inference, open DevTools → Network → Offline and run this test again. A new
              local result while offline is the evidence; a cached example is not.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-3 text-[0.8rem] text-danger">
          {error}
        </p>
      )}

      {errorCode === "APP_CHECK_FAILED" && <AppCheckHelp />}

      <p className="flex items-start gap-1.5 text-[0.7rem] text-subtle">
        <Laptop size={13} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
        Requires desktop Chrome 139+, the Prompt API model, and a user gesture. The prompt is authored here,
        so no saved document is sent.
      </p>
    </div>
  );
}
