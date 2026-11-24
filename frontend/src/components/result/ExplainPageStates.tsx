import { useEffect, useState } from "react";
import { getDeviceModelAvailability } from "../../lib/hybrid/index.ts";

export type ExplainLoadingStep = "INITIALIZING" | "PREPARING_DEVICE" | "GENERATING" | "VERIFYING" | "MAYBE_OFFLINE";

export function ExplainPageStates({ loading }: { loading: ExplainLoadingStep | null }) {
  const [avail, setAvail] = useState<string>("checking…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setAvail(await getDeviceModelAvailability());
    })();
    return () => { cancelled = true; };
  }, []);

  const showDownload = loading === "GENERATING" && avail === "downloadable";

  if (loading === "INITIALIZING") {
    return <LoadingCard title="Reading your document. Checking inputs…" />;
  }
  if (loading === "PREPARING_DEVICE" || showDownload) {
    return (
      <div className="rounded-xl border border-brand bg-surface p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text">Getting ready…</h2>
        <p className="text-sm text-subtle">
          {avail === "downloading" || loading === "PREPARING_DEVICE"
            ? "Downloading the local on-device model. This may take a couple of minutes."
            : "The on-device model is not available yet. Trying on-device first, then cloud fallback."}
        </p>
        <progress className="h-2 w-full rounded-full accent-brand" max="100" />
      </div>
    );
  }
  if (loading === "GENERATING") {
    return (
      <div className="rounded-xl border border-brand bg-surface p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text">Understanding the document…</h2>
        <p className="text-sm text-subtle">On-device or cloud inference is running.</p>
        <LoadingCard small />
      </div>
    );
  }
  if (loading === "VERIFYING") {
    return (
      <div className="rounded-xl border border-brand bg-surface p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text">Verifying deadlines and amounts against the source…</h2>
        <p className="text-sm text-subtle">Deterministic checks run locally before anything is shown.</p>
        <LoadingCard small />
      </div>
    );
  }
  return null;
}

function LoadingCard({ small = false, title = "Working…" }: { small?: boolean; title?: string }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-border bg-surface ${small ? "py-2" : "p-4"}`}>
      <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-brand" />
      <span className="text-sm text-text">{title}{".".repeat(dots)}</span>
    </div>
  );
}