import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Trash2, Info } from "lucide-react";
import { FileUploader } from "./FileUploader.tsx";
import { CameraCapture } from "./CameraCapture.tsx";
import { LanguageChips } from "./LanguageChips.tsx";
import { DemoPicker } from "./DemoPicker.tsx";
import type { LanguageCode } from "../../lib/languages.ts";

const MAX_TEXT_LENGTH = 20000;

export interface PasteBoxProps {
  onExplain: (input: { text?: string; file?: File; lang: string; demoId?: string }) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
}

export function PasteBox({ onExplain, lang, onLangChange }: PasteBoxProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData || (window as unknown as { clipboardData?: DataTransfer }).clipboardData;
      if (!clipboardData) return;
      const items = clipboardData.items;
      const itemsArray = Array.from(items);
      const textItem = itemsArray.find(
        (it: DataTransferItem) => it.type.startsWith("text/")
      );
      if (textItem) {
        e.preventDefault();
        textItem.getAsString((s: string | null) => {
          if (s) {
            setText(s);
            setDemoId(null);
            setSelectedFile(null);
            setError(null);
          }
        });
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      setDemoId(null);
      setSelectedFile(null);
      setError(null);
    },
    []
  );

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setDemoId(null);
    setText("");
    setError(null);
  }, []);

  const handleDemoSelect = useCallback((id: string) => {
    setDemoId(id);
    setText("");
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleExplain = useCallback(() => {
    setError(null);
    setProcessing(true);

    const input = demoId
      ? { demoId, lang }
      : selectedFile
        ? { file: selectedFile, lang }
        : { text: text.trim(), lang };

    if (!demoId && !selectedFile && !text.trim()) {
      setError("Please paste some text, upload a file, or try an example.");
      setProcessing(false);
      return;
    }

    if (!demoId && !selectedFile && text.trim().length > MAX_TEXT_LENGTH) {
      setError(`Text is too long. Maximum ${MAX_TEXT_LENGTH} characters.`);
      setProcessing(false);
      return;
    }

    onExplain(input);
  }, [text, selectedFile, demoId, lang, onExplain]);

  const isDisabled = processing || (!text && !selectedFile && !demoId);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Understand your documents.</h2>
          <p className="text-sm text-text-secondary">
            Paste or upload a document. We will explain what it says and what you need to do.
          </p>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          id="paste-input"
          placeholder="Paste your document here…"
          value={text}
          onChange={handleTextChange}
          rows={8}
          className="w-full rounded-xl border border-border bg-background px-4 py-4 text-text-primary focus-visible:ring-2 focus-visible:ring-focus resize-none"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          maxLength={MAX_TEXT_LENGTH}
        />
        <span className="absolute right-3 bottom-3 text-xs text-text-secondary">
          {text.length}/{MAX_TEXT_LENGTH}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Or upload a photo or PDF
        </span>
        <FileUploader onFileSelect={handleFileSelect} />
        <CameraCapture onPhotoCapture={handleFileSelect} />
      </div>

      {selectedFile && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center text-xs font-medium">
              {selectedFile.type === "application/pdf" ? (
                <FilePdfIcon />
              ) : selectedFile.type.startsWith("image/") ? (
                <ImageIcon />
              ) : (
                <FileTextIcon />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">{selectedFile.name}</span>
              <span className="text-xs text-text-secondary">
                {selectedFile.type} • {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setError(null);
              }}
              className="touch-target rounded-full p-1.5 text-text-secondary hover:text-danger"
              aria-label="Remove file"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-danger text-sm">
          <div className="flex items-start gap-2">
            <span aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <LanguageChips value={lang} onChange={onLangChange} />

        <button
          type="button"
          onClick={handleExplain}
          disabled={isDisabled}
          className={`touch-target w-full rounded-xl bg-accent px-6 py-4 text-accent-foreground text-lg font-semibold disabled:opacity-50 disabled:pointer-events-none hover:bg-accent-hover transition-colors`}
        >
          <Play size={20} strokeWidth={2} className="mr-2" />
          {processing ? "Processing…" : "Explain it"}
        </button>
      </div>

      <DemoPicker onSelect={handleDemoSelect} />

      <div className="rounded-lg border border-surface-muted bg-surface-muted p-3 text-xs text-text-secondary">
        <div className="flex items-start gap-2 mb-2">
          <Info size={14} strokeWidth={2} className="mt-0.5" />
          <span className="font-medium">Privacy</span>
        </div>
        <p className="text-text-secondary">
          Your document is processed to create an explanation. PasteWise does not store documents by
          default. External AI services may process document content when live processing is used.
          Demo examples work offline with no API key required.
        </p>
      </div>
    </section>
  );
}

function FilePdfIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12v6h6"/></svg>
  );
}

function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  );
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
  );
}
