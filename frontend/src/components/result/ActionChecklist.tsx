import { useState } from "react";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
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
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} strokeWidth={2} className="text-brand" />
        <h3 className="text-lg font-semibold text-text">What you must do</h3>
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
                className="touch-target w-full flex items-start gap-3 rounded-md border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-neutral-subtle-hovered"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[0.75rem] font-semibold ${
                    isDone
                      ? "border-success-border bg-success-subtler text-success-bolder"
                      : "border-input bg-surface text-subtle"
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-text leading-relaxed ${isDone ? "line-through text-subtle" : ""}`}>
                    {action.urgent && (
                      <span className="mr-2 inline-flex items-center gap-1 text-danger">
                        <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                        Urgent
                      </span>
                    )}
                    {action.step}
                  </p>
                  {action.evidence && (
                    <p className="text-[0.75rem] text-subtle mt-1">
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
