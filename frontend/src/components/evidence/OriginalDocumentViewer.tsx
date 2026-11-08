import { useState } from "react";
import { Search } from "lucide-react";
import { EvidenceHighlight } from "./EvidenceHighlight.tsx";

export interface OriginalDocumentViewerProps {
  enabled: boolean;
  highlights: Array<{ label: string; source: string }>;
  originalText?: string;
}

export function OriginalDocumentViewer({
  enabled,
  highlights,
  originalText,
}: OriginalDocumentViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!enabled) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Original source text</h3>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          {expanded ? <span className="text-xs font-medium text-text-secondary">Collapse</span> : <span className="text-xs font-medium text-text-secondary">Show original</span>}
        </button>
      </div>

      {expanded && originalText && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} strokeWidth={2} className="text-text-secondary" />
            <input
              type="text"
              placeholder="Search within original text…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4 font-mono text-sm text-text-primary max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
            {originalText}
          </div>
        </>
      )}

      {highlights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Evidence highlights</h4>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <EvidenceHighlight key={i} label={h.label} source={h.source} onJump={() => {}} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
