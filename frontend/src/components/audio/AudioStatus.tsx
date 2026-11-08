export interface AudioStatusProps {
  state: "idle" | "loading" | "playing" | "paused" | "error";
  message?: string;
}

export function AudioStatus({ state, message }: AudioStatusProps) {
  if (state === "idle") return null;

  const labels: Record<string, string> = {
    loading: "Preparing audio…",
    playing: "Playing",
    paused: "Paused",
    error: "Audio unavailable",
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs text-text-secondary">
      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      <span>{message || labels[state]}</span>
    </div>
  );
}
