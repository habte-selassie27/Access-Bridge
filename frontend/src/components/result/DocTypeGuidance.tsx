import { ClipboardList, ListOrdered } from "lucide-react";
import type { ExplanationResult } from "../../lib/api/types.ts";

export interface DocTypeGuidanceProps {
  result: ExplanationResult;
}

/**
 * Forms and instruction sheets are read differently from a notice.
 *
 * A form is a thing to fill in, so the fields and the submission point matter
 * most. Instructions are a sequence, so their order matters. This card states
 * how the explanation below is arranged without adding any fact that is not
 * already in the document.
 */
export function DocTypeGuidance({ result }: DocTypeGuidanceProps) {
  if (result.docType !== "form" && result.docType !== "instructions") return null;

  const isForm = result.docType === "form";
  const Icon = isForm ? ClipboardList : ListOrdered;

  return (
    <section className="rounded-lg border border-information bg-information-bg p-4">
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
        {isForm ? "Filling in this form" : "Following these instructions"}
      </h3>
      {isForm ? (
        <div className="space-y-2 text-sm text-text">
          <p>
            The checklist below follows the order the form asks for. Match each item to the box or line with the
            same wording on the paper.
          </p>
          {result.howToApply.length > 0 && (
            <p>
              <span className="font-medium">Where it goes: </span>
              {result.howToApply.join(" ")}
            </p>
          )}
          {result.documentsToBring.length > 0 && (
            <p>
              <span className="font-medium">Attach: </span>
              {result.documentsToBring.join(", ")}.
            </p>
          )}
          <p className="text-[0.75rem] text-subtle">
            Do not sign or send the form until you have checked the original. Missing fields can delay it.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-text">
          <p>
            The steps below stay in the document&rsquo;s order. Where a step says “if” or “when”, that condition is
            part of the step — do not do it unless the condition applies.
          </p>
          <p className="text-[0.75rem] text-subtle">
            If you cannot complete a step, contact the office named in the document before skipping it.
          </p>
        </div>
      )}
    </section>
  );
}
