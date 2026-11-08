import { FileText } from "lucide-react";

export interface EmptyStateProps {
  onPaste?: () => void;
  onUpload?: () => void;
  onExample?: () => void;
}

export function EmptyState({ onPaste, onUpload, onExample }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full border border-surface-muted bg-background flex items-center justify-center text-text-secondary mx-auto mb-4">
        <FileText size={24} strokeWidth={2} />
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-2">Paste a document or try an example.</h3>
      <p className="text-sm text-text-secondary mb-6">
        PasteWise works best with official notices, medical documents and financial letters.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onPaste && (
          <button type="button" onClick={onPaste} className="touch-target rounded-lg bg-accent px-4 py-2.5 text-accent-foreground text-sm font-medium hover:bg-accent-hover">
            Paste
          </button>
        )}
        {onUpload && (
          <button type="button" onClick={onUpload} className="touch-target rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary hover:bg-surface-muted">
            Upload
          </button>
        )}
        {onExample && (
          <button type="button" onClick={onExample} className="touch-target rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary hover:bg-surface-muted">
            Try an example
          </button>
        )}
      </div>
    </section>
  );
}
