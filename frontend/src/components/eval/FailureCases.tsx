export interface FailureCasesProps {
  onBack: () => void;
}

export function FailureCases({ onBack }: FailureCasesProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          Back
        </button>
        <h1 className="text-xl font-bold text-text-primary">Failure cases</h1>
      </div>
      <p className="text-sm text-text-secondary">
        We publish misses, not just wins. These drive the next round of improvement.
      </p>
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary mb-1">Amharic — ambiguous date</p>
          <p className="text-xs text-text-secondary mb-2">Date converted from Ethiopian calendar but marked verified.</p>
          <p className="text-xs text-text-secondary">Fix: Flag calendar conversion as approximate; show both dates.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary mb-1">Oromo — decimal loss</p>
          <p className="text-xs text-text-secondary mb-2">Amount "1,200.50" parsed as 1200.</p>
          <p className="text-xs text-text-secondary">Fix: Normalize decimals before comparison; round once at the end.</p>
        </div>
      </div>
    </section>
  );
}
