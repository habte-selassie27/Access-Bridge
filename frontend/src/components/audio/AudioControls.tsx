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
        className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-text disabled:opacity-50 disabled:pointer-events-none hover:bg-neutral-subtle-hovered"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={disabled || !playing}
        className="touch-target rounded-md border border-input bg-background px-3 py-2 text-sm text-subtle disabled:opacity-50 disabled:pointer-events-none hover:bg-neutral-subtle-hovered"
      >
        Stop
      </button>
    </div>
  );
}
