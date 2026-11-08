export interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin mb-3" />
      <p className="text-sm text-text-secondary">{message || "Processing…"}</p>
    </div>
  );
}
