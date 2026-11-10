export interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-16 text-center shadow-sm"
    >
      <div
        className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-text">{message || "Processing…"}</p>
      <p className="mt-1 max-w-[42ch] text-[0.75rem] leading-relaxed text-subtle">
        Dates and amounts are checked against the original document before anything is shown as verified.
      </p>
    </div>
  );
}
