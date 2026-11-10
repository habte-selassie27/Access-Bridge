import { CheckCircle2, MapPin } from "lucide-react";

export interface OpportunityCardProps {
  /** Who qualifies for this benefit, grant, scholarship or service. */
  eligibility: string[];
  /** Where and how to apply. */
  howToApply: string[];
}

/**
 * Opportunity discovery: the two facts that decide whether a person can act
 * on a notice at all — whether it is for them, and how to claim it.
 *
 * Both lists are empty when the document does not state them. The card says so
 * plainly instead of implying the person does not qualify.
 */
export function OpportunityCard({ eligibility, howToApply }: OpportunityCardProps) {
  if (eligibility.length === 0 && howToApply.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-subtle">
          <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
        </span>
        <h3 className="text-lg font-semibold text-text">Who can apply, and how</h3>
      </div>

      {eligibility.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-text">You can apply if</h4>
          <ul className="space-y-2" role="list">
            {eligibility.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {howToApply.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
            <MapPin size={14} strokeWidth={2} aria-hidden="true" />
            How to apply
          </h4>
          <ol className="space-y-2" role="list">
            {howToApply.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[0.7rem] font-semibold text-inverse">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-3 text-[0.75rem] text-subtle">
        Taken from the document. If you are not sure you qualify, ask the issuing office.
      </p>
    </section>
  );
}
