import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ShieldAlert } from "lucide-react";
import type { EligibilityResult, LangCode } from "../../lib/api/types.ts";

export interface EligibilityCheckProps {
  sourceText: string;
  result: { originalText: string; eligibility: string[] };
  lang: LangCode;
}

const STATUS_META = {
  met: { label: "Looks met", icon: CheckCircle2, className: "text-success", mark: "✅" },
  not_met: { label: "Looks not met", icon: XCircle, className: "text-danger", mark: "❌" },
  unknown: { label: "Not enough information", icon: HelpCircle, className: "text-warning", mark: "⚠️" },
} as const;

/**
 * Opportunity Access.
 *
 * The reader describes themselves, the published requirements are checked
 * against that description, and every answer must come with a quote from the
 * document. A quote the server cannot find in the source is downgraded to
 * "not enough information" rather than shown as a fact.
 */
export function EligibilityCheck({ sourceText, result, lang }: EligibilityCheckProps) {
  const [profile, setProfile] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!profile.trim()) {
      setError("Tell us a little about yourself first.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: sourceText || result.originalText, profile, lang }),
      });
      const json = await res.json().catch(() => null);
      if (!json || json.ok !== true) {
        throw new Error((typeof json?.error === "string" ? json.error : json?.error?.message) || "The check failed.");
      }
      setData(json.data);
      setStatus("done");
    } catch (e: any) {
      setError(e?.message || "We could not run the check right now.");
      setStatus("error");
    }
  }, [profile, sourceText, result.originalText, lang]);

  const criteria = result.eligibility || [];

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <h2 className="text-base font-semibold text-text">Opportunity check</h2>
        <p className="text-[0.8rem] text-subtle">
          Tell us about yourself and we will compare it to the requirements this document publishes.
        </p>
      </div>

      {criteria.length > 0 && (
        <ul className="space-y-1 rounded-md border border-border bg-background p-3 text-[0.8rem] text-subtle">
          <li className="font-medium text-text">Published requirements</li>
          {criteria.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      )}

      <label className="block">
        <span className="form-label">About you</span>
        <textarea
          className="textfield mt-1 block min-h-[5rem] w-full resize-y rounded-md border border-input bg-input-bg px-3 py-2 text-sm text-text"
          placeholder="For example: I am 21, I study Accounting at Addis Ababa University, my GPA is 3.4, I live in Addis Ababa."
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
        />
      </label>

      <button
        type="button"
        onClick={run}
        disabled={status === "loading"}
        className="touch-target w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-inverse disabled:opacity-60"
      >
        {status === "loading" ? "Checking…" : "Check my eligibility"}
      </button>

      {error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
          {error}
        </p>
      )}

      {status === "done" && data && (
        <div className="space-y-3">
          <p className="text-sm text-text">{data.summary}</p>
          <ul className="space-y-2">
            {data.items.map((item, i) => {
              const meta = STATUS_META[item.status];
              return (
                <li key={i} className="rounded-md border border-border bg-background p-3">
                  <p className="text-sm font-medium text-text">
                    <span aria-hidden="true">{meta.mark}</span> {item.criterion}
                  </p>
                  <p className={`text-[0.8rem] ${meta.className}`}>{meta.label}</p>
                  {item.reason && <p className="text-[0.8rem] text-subtle">{item.reason}</p>}
                  {item.quote && (
                    <p className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtle">
                      “{item.quote}”
                    </p>
                  )}
                  {item.warning && (
                    <p className="mt-1 text-[0.75rem] text-warning">{item.warning}</p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg p-2 text-[0.75rem] text-warning">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {data.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
