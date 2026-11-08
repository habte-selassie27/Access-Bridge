import { useRef, useState, useCallback } from "react";
import { Upload, FileText, Image } from "lucide-react";
import { FilePreview } from "./FilePreview.tsx";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf", "text/plain"];

export interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Unsupported file type. Please upload JPEG, PNG, PDF or plain text.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 8 MB.");
        return;
      }

      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [previewUrl]);

  const iconByType = (file: File | null) => {
    if (!file) return <Upload size={24} strokeWidth={2} />;
    if (file.type === "application/pdf") return <FileText size={24} strokeWidth={2} />;
    if (file.type.startsWith("image/")) return <Image size={24} strokeWidth={2} />;
    return <FileText size={24} strokeWidth={2} />;
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={openPicker}
        className="touch-target w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-6 py-8 text-text-secondary hover:border-accent hover:text-accent transition-colors"
      >
        {iconByType(selectedFile)}
        <span className="text-sm font-medium">
          {selectedFile ? "Change file" : "Upload photo or PDF"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        hidden
      />

      {selectedFile && (
        <>
          <FilePreview file={selectedFile} onRemove={removeFile} previewUrl={previewUrl} />
          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-danger text-sm">
              {error}
            </div>
          )}
        </>
      )}
      {!selectedFile && error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-danger text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
