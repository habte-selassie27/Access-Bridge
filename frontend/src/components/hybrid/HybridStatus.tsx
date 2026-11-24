import { useEffect, useState } from "react";
import { getDeviceModelAvailability, getHybridModel, initializeDeviceModel } from "../../lib/hybrid/index.ts";

/**
 * On-device model preparation.
 *
 * The global status strip already reports capability, network and requested
 * mode, so this component only renders when there is something the reader can
 * actually do: download the model, or see that preparation is in progress.
 * The progress percentage comes from the SDK, not an invented timer.
 */
export function HybridStatus() {
  const [availability, setAvailability] = useState<string>("checking");
  const [progress, setProgress] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await getDeviceModelAvailability();
      if (!cancelled) setAvailability(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prepare = async () => {
    const model = getHybridModel();
    if (!model) return;
    setPreparing(true);
    setProgress(0);
    try {
      await initializeDeviceModel(model, (pct) => setProgress(pct));
      setAvailability(await getDeviceModelAvailability());
    } finally {
      setPreparing(false);
    }
  };

  const needsDownload = availability === "downloadable" || availability === "downloading";
  if (!needsDownload && !preparing) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-information bg-information-bg px-4 py-2.5 text-[0.8rem] text-text">
      <span>
        The on-device model is not downloaded yet. Prepare it now to keep documents on this device.
      </span>
      <button
        type="button"
        onClick={() => void prepare()}
        disabled={preparing}
        className="touch-target rounded-md border border-input bg-background px-2.5 py-1 text-[0.75rem] font-medium text-text disabled:opacity-60"
      >
        {preparing ? `Preparing… ${progress ?? 0}%` : "Download on-device model"}
      </button>
    </div>
  );
}
