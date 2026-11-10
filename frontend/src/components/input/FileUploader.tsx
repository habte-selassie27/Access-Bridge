import { useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { downscaleImage } from "../../lib/image.ts";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".txt", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

const ACCEPTED_MIMES = [
  "text/plain",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    ACCEPTED_MIMES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))
  );
}

export function validateFile(file: File): string | null {
  if (!isAcceptedFile(file)) {
    return "Unsupported file type. Upload a TXT, PDF, PNG, JPG, JPEG or WEBP file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10 MB.";
  }
  return null;
}

export interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileSelect, disabled = false }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const problem = validateFile(file);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      const processed = await downscaleImage(file);
      if (processed.size > MAX_FILE_SIZE) {
        setError("File is too large after processing. Maximum size is 10 MB.");
        return;
      }
      onFileSelect(processed);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void accept(e.target.files?.[0]);
    },
    [accept]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      void accept(e.dataTransfer.files?.[0]);
    },
    [accept, disabled]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-brand bg-selected" : "border-input bg-surface-muted"
        }`}
      >
        <Upload size={22} strokeWidth={2} className="mx-auto mb-2 text-subtle" aria-hidden="true" />
        <p className="text-sm text-text">Drag a file here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="touch-target mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-brand hover:bg-surface hover:text-brand disabled:pointer-events-none disabled:opacity-60"
        >
          Choose a file
        </button>
        <p className="mt-3 text-[0.75rem] text-subtlest">TXT, PDF, PNG, JPG or WEBP · up to 10 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleChange}
        hidden
      />
      {error && (
        <p role="alert" className="mt-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
