import { FileText } from "lucide-react";

export interface EmptyStateProps {
  onPaste?: () => void;
  onUpload?: () => void;
  onExample?: () => void;
}

export function EmptyState({ onPaste, onUpload, onExample }: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full border border-surface-muted bg-background flex items-center justify-center text-subtle mx-auto mb-4">
        <FileText size={24} strokeWidth={2} />
      </div>
      <h3 className="text-lg font-bold text-text mb-2">Paste a document or try an example.</h3>
      <p className="text-sm text-subtle mb-6">
        PasteWise works best with official notices, medical documents and financial letters.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onPaste && (
          <button type="button" onClick={onPaste} className="touch-target rounded-md bg-brand px-4 py-2.5 text-inverse text-sm font-medium hover:bg-brand">
            Paste
          </button>
        )}
        {onUpload && (
          <button type="button" onClick={onUpload} className="touch-target rounded-md border border-input bg-background px-4 py-2.5 text-sm text-text hover:bg-neutral-subtle-hovered">
            Upload
          </button>
        )}
        {onExample && (
          <button type="button" onClick={onExample} className="touch-target rounded-md border border-input bg-background px-4 py-2.5 text-sm text-text hover:bg-neutral-subtle-hovered">
            Try an example
          </button>
        )}
      </div>
    </section>
  );
}
