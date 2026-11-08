export interface EvidenceHighlightProps {
  label: string;
  source: string;
  onJump: () => void;
}

export function EvidenceHighlight({ label, source, onJump }: EvidenceHighlightProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        <button
          type="button"
          onClick={onJump}
          className="touch-target rounded p-1 text-text-secondary hover:text-accent"
          aria-label="Jump to source"
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
