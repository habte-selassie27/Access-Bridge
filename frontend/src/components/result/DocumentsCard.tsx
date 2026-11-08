import { useState } from "react";

export interface DocumentsCardProps {
  items: string[];
}

export function DocumentsCard({ items }: DocumentsCardProps) {
  if (items.length === 0) return null;

  const [done, setDone] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-full border border-border bg-background flex items-center justify-center text-xs font-medium text-text-primary">
          📄
        </span>
        <h3 className="text-lg font-semibold text-text-primary">Documents to bring</h3>
      </div>
      <ul className="space-y-2" role="list">
        {items.map((item, i) => {
          const isDone = done.has(item);
          return (
            <li key={i}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={() => toggle(item)}
                className="touch-target w-full flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-surface-muted"
              >
                <div className="touch-target shrink-0 rounded-full border border-border p-1 flex items-center justify-center">
                  {isDone ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    </span>
                  )}
                </div>
                <span className={`text-text-primary ${isDone ? "line-through text-text-secondary" : ""}`}>
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-text-secondary">
        Check items off as you prepare them. These checkboxes are saved only on your device.
      </p>
    </section>
  );
}
