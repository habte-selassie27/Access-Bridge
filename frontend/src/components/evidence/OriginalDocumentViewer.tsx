import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { EvidenceHighlight } from "./EvidenceHighlight.tsx";
import { motionBehavior } from "../../lib/a11y.ts";

export interface OriginalDocumentViewerProps {
  enabled: boolean;
  highlights: Array<{ label: string; source: string }>;
  originalText?: string;
  /** Controlled highlighted quote. */
  activeQuote?: string | null;
  /** Called when the reader jumps to a quote from either card or list. */
  onActiveQuoteChange?: (quote: string) => void;
  /** Start with the original text expanded (desktop reading column). */
  defaultExpanded?: boolean;
}

export function OriginalDocumentViewer({
  enabled,
  highlights,
  originalText,
  activeQuote: controlledQuote,
  onActiveQuoteChange,
  defaultExpanded = false,
}: OriginalDocumentViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [internalQuote, setInternalQuote] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeQuote = controlledQuote !== undefined ? controlledQuote : internalQuote;

  const jumpToSource = useCallback(
    (quote: string) => {
      setExpanded(true);
      if (onActiveQuoteChange) onActiveQuoteChange(quote);
      else setInternalQuote(quote);
    },
    [onActiveQuoteChange]
  );

  // When a card on the page sets a quote, reveal the source panel and scroll it
  // into view once the text has rendered.
  useEffect(() => {
    if (!activeQuote) return;
    setExpanded(true);
    const frame = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeQuote]);

  if (!enabled) return null;

  const parts = originalText && activeQuote ? originalText.split(activeQuote) : null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">Original document</h2>
        {originalText && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="original-text-panel"
            className="touch-target inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-[0.75rem] text-text transition-colors hover:bg-neutral-subtle-hovered sm:text-sm"
          >
            {expanded ? "Hide original" : "Show original"}
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
          <h3 className="mb-2 text-sm font-semibold text-text">Evidence in the original</h3>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <EvidenceHighlight
                key={`${h.label}-${i}`}
                label={h.label}
                source={h.source}
                onJump={() => jumpToSource(h.source)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
