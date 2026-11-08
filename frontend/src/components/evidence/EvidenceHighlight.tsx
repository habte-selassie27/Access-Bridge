export interface EvidenceHighlightProps {
  label: string;
  source: string;
  active?: boolean;
  onJump: () => void;
}

export function EvidenceHighlight({ label, source, active = false, onJump }: EvidenceHighlightProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-warning bg-warning/10" : "border-border bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        <button
          type="button"
          onClick={onJump}
          className="touch-target rounded p-1 text-text-secondary hover:text-accent"
          aria-label="Jump to source"
          aria-pressed={active}
        >
          ↗
        </button>
      </div>
      <p className="text-xs text-text-primary italic bg-surface-muted p-2 rounded">
        “{source}”
      </p>
    </div>
  );
}
