export interface AudioControlsProps {
  playing: boolean;
  onToggle: () => void;
  onStop: () => void;
  disabled: boolean;
}

export function AudioControls({ playing, onToggle, onStop, disabled }: AudioControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="touch-target rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary disabled:opacity-50 disabled:pointer-events-none hover:bg-surface-muted"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={disabled || !playing}
        className="touch-target rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-secondary disabled:opacity-50 disabled:pointer-events-none hover:bg-surface-muted"
      >
        Stop
      </button>
    </div>
  );
}
