export interface ProcessingSkeletonProps {
  className?: string;
}

export function ProcessingSkeleton({ className }: ProcessingSkeletonProps) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-4 shadow-sm ${className || ""}`}>
      <div className="space-y-4">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-4 w-1/2 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
      </div>
    </div>
  );
}
