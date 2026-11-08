export interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onExample?: () => void;
  retryLabel?: string;
  exampleLabel?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  onExample,
  retryLabel = "Try again",
  exampleLabel = "Use an example",
}: ErrorStateProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
      <span className="w-12 h-12 rounded-full border border-danger/20 bg-danger/10 flex items-center justify-center text-danger mx-auto mb-4">
        <AlertCircleIcon size={24} strokeWidth={2} />
      </span>
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary mb-6">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="touch-target rounded-lg bg-accent px-4 py-2.5 text-accent-foreground text-sm font-medium hover:bg-accent-hover"
          >
            {retryLabel}
          </button>
        )}
        {onExample && (
          <button
            type="button"
            onClick={onExample}
            className="touch-target rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary hover:bg-surface-muted"
          >
            {exampleLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function AlertCircleIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );
}
