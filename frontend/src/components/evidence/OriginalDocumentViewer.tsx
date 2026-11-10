import { Fragment, useCallback, useRef, useState } from "react";
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
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const jumpToSource = useCallback((quote: string) => {
    setExpanded(true);
    setActiveQuote(quote);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  if (!enabled) return null;

  const parts = originalText && activeQuote ? originalText.split(activeQuote) : null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-text">Original source text</h3>
        {originalText && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="original-text-panel"
            className="touch-target inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-[0.75rem] text-text transition-colors hover:bg-neutral-subtle-hovered sm:text-sm"
          >
            <span className="sm:hidden">{expanded ? "Hide" : "Show"}</span>
            <span className="hidden sm:inline">{expanded ? "Hide original" : "Show original"}</span>
          </button>
        )}
      </div>

      {expanded && originalText && (
        <div
          id="original-text-panel"
          ref={panelRef}
          className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-muted p-3 text-sm leading-relaxed text-text"
        >
          {parts
            ? parts.map((part, i) => (
                <Fragment key={i}>
                  {part}
                  {i < parts.length - 1 && (
                    <mark className="rounded bg-warning-bg px-0.5 text-text">{activeQuote}</mark>
                  )}
                </Fragment>
              ))
            : originalText}
        </div>
      )}

      {highlights.length > 0 && (
        <div className={expanded && originalText ? "mt-4" : ""}>
          <h4 className="mb-3 text-sm font-semibold text-text">Evidence highlights</h4>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <EvidenceHighlight key={i} label={h.label} source={h.source} onJump={() => jumpToSource(h.source)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
