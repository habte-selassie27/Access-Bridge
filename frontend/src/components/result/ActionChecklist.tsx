import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { Action } from "../../lib/api/types.ts";

export interface ActionChecklistProps {
  actions: Action[];
}

export function ActionChecklist({ actions }: ActionChecklistProps) {
  const [done, setDone] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (actions.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} strokeWidth={2} className="text-accent" />
        <h3 className="text-lg font-semibold text-text-primary">What you must do</h3>
      </div>
      <ol className="space-y-3" role="list">
        {actions.map((action, i) => {
          const isDone = done.has(action.id);
          return (
            <li key={action.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={() => toggle(action.id)}
                className="touch-target w-full flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-surface-muted"
              >
                <div className="touch-target shrink-0 rounded-full border border-border p-1 flex items-center justify-center mt-0.5">
                  {isDone ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center">
                      <span className="text-xs font-bold">{i + 1}</span>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-text-primary leading-relaxed ${isDone ? "line-through text-text-secondary" : ""}`}>
                    {action.urgent && (
                      <span className="mr-2 inline-flex items-center gap-1 text-danger">
                        <AlertTriangle size={12} strokeWidth={2} />
                        Urgent
                      </span>
                    )}
                    {action.step}
                  </p>
                  {action.evidence && (
                    <p className="text-xs text-text-secondary mt-1">
                      Source: “{action.evidence.quote}”
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
