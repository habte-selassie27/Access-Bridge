export interface ProcessingPanelProps {
  stage: "idle" | "validating" | "extracting" | "understanding" | "verifying" | "translating" | "completed" | "failed" | "timed_out";
  message?: string;
}

const STAGE_LABELS: Record<ProcessingPanelProps["stage"], string> = {
  idle: "Ready",
  validating: "Checking your document",
  extracting: "Reading your document",
  understanding: "Understanding the content",
  verifying: "Checking dates and amounts",
  translating: "Preparing your language",
  completed: "Ready",
  failed: "Processing failed",
  timed_out: "Processing timed out",
};

export function ProcessingPanel({ stage, message }: ProcessingPanelProps) {
  const label = message || STAGE_LABELS[stage];

  if (stage === "idle") return null;

  const isTerminal = stage === "completed" || stage === "failed" || stage === "timed_out";

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2 h-2 rounded-full bg-accent">
          {stage !== "completed" && stage !== "failed" && stage !== "timed_out" && (
            <span className="sr-only">Processing</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
      </div>
      <p className="text-xs text-text-secondary">
        {stage === "failed"
          ? "We could not process this document. Please try again or use an example."
          : stage === "timed_out"
            ? "The request took too long. Please try again or use an offline example."
            : stage === "completed"
              ? "Your explanation is ready."
              : "This may take a moment."}
      </p>
      {isTerminal && (
        <button
          type="button"
          className="mt-4 touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary hover:bg-surface-muted"
        >
          Try again
        </button>
      )}
    </section>
  );
}
