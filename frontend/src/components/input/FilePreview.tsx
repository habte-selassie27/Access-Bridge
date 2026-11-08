export interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  previewUrl: string | null;
}

export function FilePreview({ file, onRemove, previewUrl }: FilePreviewProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-text-primary truncate">{file.name}</span>
          <span className="text-xs text-text-secondary">{ (file.size / 1024).toFixed(1) } KB</span>
        </div>
        <span className="text-xs text-text-secondary">{file.type || "Unknown type"}</span>
      </div>
      {previewUrl && file.type.startsWith("image/") && (
        <img src={previewUrl} alt="Preview" className="w-16 h-16 rounded-lg border border-border object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="touch-target rounded-full p-1 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
        aria-label="Remove file"
      >
        <span className="sr-only">Remove file</span>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
