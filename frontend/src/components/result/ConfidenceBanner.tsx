import type { ExplanationResult } from "../../lib/api/types.ts";
import { languageTier } from "../../lib/languages.ts";

export interface ConfidenceBannerProps {
  result: ExplanationResult;
}

export function ConfidenceBanner({ result }: ConfidenceBannerProps) {
  const quality = result.languageQuality ?? languageTier(result.lang);
  const hasExtractionIssue = result.warnings.some((w: string) =>
    w.toLowerCase().includes("read") || w.toLowerCase().includes("unclear") || w.toLowerCase().includes("difficult")
  );
  const hasLowConfidence = result.confidence === "low";
  const hasUnverified = result.deadlines.some((d) => !d.verified) || result.costs.some((c) => !c.verified);

  if (!hasExtractionIssue && !hasLowConfidence && !hasUnverified && quality !== "experimental") return null;

  const messages: string[] = [];
  if (quality === "experimental") {
    messages.push(
      "This language is supported but has not been measured yet. Read the original before acting on important details, or switch to Amharic, Oromo, Tigrinya or English, which are on the evaluation page."
    );
  }
  if (hasExtractionIssue) {
    messages.push("Some parts of this document were difficult to read. Check the original before acting.");
  }
  if (hasLowConfidence) {
    messages.push("The overall explanation confidence is low. Verify important details against the original.");
  }
  if (hasUnverified) {
    messages.push("Some dates or amounts could not be confirmed in the source. Check the original document.");
  }

  return (
    <section className="rounded-lg border border-warning-border bg-warning-bg p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">!</span>
        <div>
          <p className="text-sm text-warning font-medium">{messages[0]}</p>
          {messages.slice(1).map((msg, i) => (
            <p key={i} className="text-sm text-text mt-1">{msg}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
