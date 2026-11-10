import { useState, useCallback, useEffect, useRef } from "react";
import { FileText, Image as ImageIcon, Info, Play, Trash2 } from "lucide-react";
import { FileUploader } from "./FileUploader.tsx";
import { CameraCapture } from "./CameraCapture.tsx";
import { LanguageChips } from "./LanguageChips.tsx";
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
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const clipboardData =
      e.clipboardData || (window as unknown as { clipboardData?: DataTransfer }).clipboardData;
    if (!clipboardData) return;
    const items = clipboardData.items;
    const textItem = Array.from(items).find((it: DataTransferItem) => it.type.startsWith("text/"));
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
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setDemoId(null);
    setError(null);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setDemoId(null);
    setText("");
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
      setError("Paste some text, upload a file, or choose an example.");
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
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text sm:text-3xl">Understand your documents.</h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-subtle">
          Paste or upload a document. We will explain what it says and what you need to do.
        </p>
      </div>

      <div ref={cardRef} className="scroll-mt-20 space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="relative">
          <label htmlFor="paste-input" className="sr-only">
            Paste your document
          </label>
          <textarea
            id="paste-input"
            placeholder="Paste your document here…"
            value={text}
            onChange={handleTextChange}
            rows={8}
            className="block w-full resize-y rounded-md border border-input bg-input-bg px-4 py-3 text-text placeholder:text-subtlest focus-visible:border-focused focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focused"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            maxLength={MAX_TEXT_LENGTH}
          />
          <span className="pointer-events-none absolute bottom-3 right-3 select-none rounded bg-surface/90 px-1 py-0.5 text-[0.75rem] text-subtlest">
            {text.length}/{MAX_TEXT_LENGTH}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FileUploader onFileSelect={handleFileSelect} />
          <CameraCapture onPhotoCapture={handleFileSelect} />
        </div>

        {selectedFile && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-subtle">
              {selectedFile.type === "application/pdf" ? (
                <FileText size={16} strokeWidth={2} />
              ) : selectedFile.type.startsWith("image/") ? (
                <ImageIcon size={16} strokeWidth={2} />
              ) : (
                <FileText size={16} strokeWidth={2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{selectedFile.name}</p>
              <p className="truncate text-[0.75rem] text-subtle">
                {selectedFile.type || "Unknown type"} · {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setError(null);
              }}
              className="touch-target rounded-full p-1.5 text-subtle transition-colors hover:bg-danger-bg hover:text-danger"
              aria-label="Remove file"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 text-[0.75rem] text-danger"
          >
            <div className="flex items-start gap-2">
              <span aria-hidden="true">!</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-sm font-medium text-text">Explain in</span>
          <LanguageChips value={lang} onChange={onLangChange} />
        </div>

        <button
          type="button"
          onClick={handleExplain}
          disabled={isDisabled}
          aria-busy={processing}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse transition-colors hover:bg-brand-bold disabled:pointer-events-none disabled:bg-neutral-subtle-hovered disabled:text-subtlest"
        >
          <Play size={18} strokeWidth={2} aria-hidden="true" />
          {processing ? "Processing…" : "Explain it"}
        </button>
      </div>



      <div className="rounded-lg border border-border bg-surface-muted p-4 text-[0.75rem] text-subtle">
        <div className="mb-1 flex items-center gap-2 font-medium text-text">
          <Info size={14} strokeWidth={2} aria-hidden="true" />
          <span>Privacy</span>
        </div>
        <p className="leading-relaxed">
          Your document is processed to create an explanation. AccessBridge does not store documents by
          default. External AI services may process document content when live processing is used.
          Demo examples work offline with no API key required.
        </p>
      </div>
    </section>
  );
}
