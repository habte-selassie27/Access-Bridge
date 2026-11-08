import { useMemo, useRef, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { EvidenceHighlight } from "./EvidenceHighlight.tsx";

export interface EvidenceItem {
  label: string;
  quote: string;
  /** [start, end) offsets into originalText, computed by the verifier. */
  span: [number, number];
}

export interface OriginalDocumentViewerProps {
  enabled: boolean;
  highlights: EvidenceItem[];
  originalText?: string;
}

interface Segment {
  text: string;
  evidenceIndex: number | null;
  search: boolean;
}

export function OriginalDocumentViewer({
  enabled,
  highlights,
  originalText,
}: OriginalDocumentViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [searchSpan, setSearchSpan] = useState<[number, number] | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const text = originalText ?? "";

  // Only spans we can actually slice are trusted; everything else is dropped
  // rather than highlighting the wrong words.
  const usable = useMemo(() => {
    const valid = highlights
      .map((h, index) => ({ ...h, index }))
      .filter(
        (h) =>
          Array.isArray(h.span) &&
          h.span.length === 2 &&
          h.span[0] >= 0 &&
          h.span[1] <= text.length &&
          h.span[0] < h.span[1]
      )
      .sort((a, b) => a.span[0] - b.span[0]);
    const out: typeof valid = [];
    let cursor = -1;
    for (const h of valid) {
      if (h.span[0] < cursor) continue; // overlapping span: skip, never mis-highlight
      out.push(h);
      cursor = h.span[1];
    }
    return out;
  }, [highlights, text.length]);

  const segments = useMemo(() => {
    const ranges = usable.map((h) => ({
      start: h.span[0],
      end: h.span[1],
      evidenceIndex: h.index as number | null,
      search: false,
    }));
    if (searchSpan) {
      ranges.push({ start: searchSpan[0], end: searchSpan[1], evidenceIndex: null, search: true });
    }
    ranges.sort((a, b) => a.start - b.start);

    const parts: Segment[] = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start < cursor) continue; // overlapping range: skip rather than mis-highlight
      if (r.start > cursor) {
        parts.push({ text: text.slice(cursor, r.start), evidenceIndex: null, search: false });
      }
      parts.push({ text: text.slice(r.start, r.end), evidenceIndex: r.evidenceIndex, search: r.search });
      cursor = r.end;
    }
    if (cursor < text.length) {
      parts.push({ text: text.slice(cursor), evidenceIndex: null, search: false });
    }
    return parts;
  }, [text, usable, searchSpan]);

  useEffect(() => {
    if (activeIndex === null || !textRef.current) return;
    textRef.current
      .querySelector(`[data-evidence="${activeIndex}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex, expanded]);

  if (!enabled) return null;

  const jumpTo = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
    setExpanded(true);
  };

  const runSearch = () => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setSearchSpan(null);
      return;
    }
    const at = text.toLowerCase().indexOf(needle);
    setSearchSpan(at >= 0 ? [at, at + needle.length] : null);
    setExpanded(true);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Original source text</h3>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          <span className="text-xs font-medium text-text-secondary">
            {expanded ? "Collapse" : "Show original"}
          </span>
        </button>
      </div>

      {expanded && text && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} strokeWidth={2} className="text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search within original text…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-focus"
            />
            <button
              type="button"
              onClick={runSearch}
              className="touch-target rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
            >
              Find
            </button>
          </div>
          {query.trim() && !searchSpan && (
            <p className="mb-2 text-xs text-warning">Not found in the original text.</p>
          )}
          <div
            ref={textRef}
            className="rounded-lg border border-border bg-background p-4 font-mono text-sm text-text-primary max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words"
          >
            {segments.map((seg, i) =>
              seg.evidenceIndex !== null ? (
                <mark
                  key={i}
                  data-evidence={seg.evidenceIndex}
                  className={`rounded px-0.5 ${
                    activeIndex === seg.evidenceIndex
                      ? "bg-warning/40 text-text-primary ring-2 ring-warning"
                      : "bg-warning/20 text-text-primary"
                  }`}
                >
                  {seg.text}
                </mark>
              ) : seg.search ? (
                <mark key={i} className="rounded px-0.5 bg-accent/30 text-text-primary">
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </div>
        </>
      )}

      {highlights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-text-primary mb-1">Evidence highlights</h4>
          <p className="text-xs text-text-secondary mb-3">
            Each quote is found in the original document. Tap ↗ to see exactly where.
          </p>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <EvidenceHighlight
                key={i}
                label={h.label}
                source={h.quote}
                active={activeIndex === i}
                onJump={() => jumpTo(i)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
