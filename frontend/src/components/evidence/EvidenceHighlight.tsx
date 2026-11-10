import { ArrowUpRight } from "lucide-react";

export interface EvidenceHighlightProps {
  label: string;
  source: string;
  onJump: () => void;
}

export function EvidenceHighlight({ label, source, onJump }: EvidenceHighlightProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[0.75rem] font-medium text-subtle">{label}</span>
        <button
          type="button"
          onClick={onJump}
          className="touch-target inline-flex items-center justify-center rounded text-subtle transition-colors hover:text-brand"
          aria-label={`Jump to source for ${label}`}
        >
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className="rounded bg-surface-muted p-2 text-sm text-text">“{source}”</p>
    </div>
  );
}
