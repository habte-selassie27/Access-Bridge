import { Download, FileWarning } from "lucide-react";
import type { OriginalFile } from "../../lib/library.ts";

export interface OriginalFileViewerProps {
  file: OriginalFile;
}

/**
 * The uploaded document itself, not a transcription of it.
 *
 * The reader can compare an explanation against the actual scan or PDF. When
 * the browser could not keep the file, the reason is shown plainly instead of
 * pretending the extracted text is the original.
 */
export function OriginalFileViewer({ file }: OriginalFileViewerProps) {
  if (!file.dataUrl) {
    return (
      <div className="rounded-md border border-warning-border bg-warning-bg p-3 text-sm text-text" role="note">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-warning">
          <FileWarning size={15} aria-hidden="true" /> Original file not kept
        </p>
        <p>{file.note || "The original file was too large to keep on this device."}</p>
        <p className="mt-1 text-[0.75rem] text-subtle">The extracted text below is still available to compare.</p>
      </div>
    );
  }

  const isImage = file.mime.startsWith("image/");
  const isPdf = file.mime === "application/pdf";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[0.75rem] text-subtle">
          {file.name} · {isPdf ? "PDF" : isImage ? "Image" : "Original file"}
        </p>
        <a
          href={file.dataUrl}
          download={file.name}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[0.75rem] text-text"
        >
          <Download size={12} aria-hidden="true" /> Download
        </a>
      </div>
      {isImage ? (
        <img
          src={file.dataUrl}
          alt={`Original document: ${file.name}`}
          className="max-h-[32rem] w-full rounded-md border border-border bg-surface-muted object-contain"
        />
      ) : (
        <iframe
          src={file.dataUrl}
          title={`Original document: ${file.name}`}
          className="h-[32rem] w-full rounded-md border border-border bg-surface-muted"
        />
      )}
    </div>
  );
}
