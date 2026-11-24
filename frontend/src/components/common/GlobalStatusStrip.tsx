import { Cloud, Laptop, WifiOff, ShieldAlert, Info } from "lucide-react";
import type { ElementType } from "react";
import type { CapabilityState, PrivacyMode } from "../../lib/privacy/modes.ts";
import { PRIVACY_LABELS } from "../../lib/privacy/modes.ts";

export interface GlobalStatusStripProps {
  capability: CapabilityState;
  online: boolean;
  privacyMode: PrivacyMode;
  lastSource: "on-device" | "cloud" | "not-run" | null;
}

const LAST_SOURCE_LABEL: Record<string, string> = {
  "on-device": "Last run: processed on this device",
  cloud: "Last run: processed in cloud",
  "not-run": "No document processed yet",
  null: "No document processed yet",
};

const SOURCE_ICON: Record<string, ElementType> = {
  "on-device": Laptop,
  cloud: Cloud,
  "not-run": Info,
  null: Info,
};

/**
 * Compact privacy and AI status bar (UI.md §3.2).
 *
 * Capability, connectivity, actual last execution source and the requested
 * mode are separate facts. Nothing here is inferred from the requested mode.
 */
export function GlobalStatusStrip({ capability, online, privacyMode, lastSource }: GlobalStatusStripProps) {
  const Icon = SOURCE_ICON[lastSource ?? "null"];
  const lastSourceLabel = LAST_SOURCE_LABEL[lastSource ?? "null"];

  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-[0.8rem] text-text"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="flex items-center gap-1.5">
        {capability === "ready" ? (
          <>
            <Laptop size={14} strokeWidth={2} className="text-status-info" aria-hidden="true" />
            <span className="text-status-info">Device AI ready</span>
          </>
        ) : capability === "checking" ? (
          <>
            <Info size={14} strokeWidth={2} aria-hidden="true" />
            <span>Checking device AI…</span>
          </>
        ) : capability === "error" ? (
          <>
            <ShieldAlert size={14} strokeWidth={2} className="text-status-danger" aria-hidden="true" />
            <span className="text-status-danger">Device AI check failed</span>
          </>
        ) : (
          <>
            <ShieldAlert size={14} strokeWidth={2} className="text-status-warning" aria-hidden="true" />
            <span className="text-status-warning">Device AI unavailable</span>
          </>
        )}
      </span>

      <span className="flex items-center gap-1.5">
        {online ? (
          <span className="text-status-success">Network online</span>
        ) : (
          <>
            <WifiOff size={14} strokeWidth={2} className="text-status-danger" aria-hidden="true" />
            <span className="text-status-danger">Network offline</span>
          </>
        )}
      </span>

      <span className="flex items-center gap-1.5">
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        {lastSourceLabel}
      </span>

      <span className="text-subtle">Requested mode: {PRIVACY_LABELS[privacyMode]}</span>
    </div>
  );
}
