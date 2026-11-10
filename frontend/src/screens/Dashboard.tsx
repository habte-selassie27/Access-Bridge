import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Languages,
  Volume2,
  ListChecks,
  Target,
  FileText,
  MessageSquare,
  Clock,
  Mic,
  Square,
  Accessibility,
  Sparkles,
  ArrowRight,
  History as HistoryIcon,
} from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { A11yControls } from "../components/settings/A11yControls.tsx";
import { validateFile } from "../components/input/FileUploader.tsx";
import { listDocs, listConversations } from "../lib/library.ts";
import type { LibraryDoc, ConversationRecord } from "../lib/library.ts";
import { loadLastLanguage, saveLastLanguage } from "../lib/languages.ts";
import type { LanguageCode } from "../lib/languages.ts";
import { setPendingUpload } from "../lib/pending-upload.ts";

const QUICK_ACTIONS = [
  { href: "/translate", label: "Translate", hint: "Read a document in another language.", icon: Languages },
  { href: "/voice", label: "Voice assistant", hint: "Listen to a document or read text aloud.", icon: Volume2 },
  { href: "/actions", label: "Action guide", hint: "Turn the information into tasks.", icon: ListChecks },
  { href: "/opportunity", label: "Opportunity check", hint: "See if you meet the requirements.", icon: Target },
];

const SUGGESTIONS = [
  "What is the deadline?",
  "What do I need to bring?",
  "How much do I have to pay?",
  "Explain this like I am a beginner.",
];

export interface DashboardProps {
  onOpenDoc: (doc: LibraryDoc) => void;
}

export function Dashboard({ onOpenDoc }: DashboardProps) {
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [convos, setConvos] = useState<ConversationRecord[]>([]);
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setDocs(listDocs().slice(0, 5));
    setConvos(listConversations().slice(0, 5));
  }, []);

  const voiceSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  /** One tap: dictate the assistant question in the reader's language. */
  const startVoice = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    if (!voiceSupported) {
      setVoiceError("Voice input is not supported in this browser. Type your question instead.");
      return;
    }
    setVoiceError(null);
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setQuestion(transcript.trim());
      stopListening();
    };
    rec.onerror = (event: any) => {
      setVoiceError(
        event?.error === "not-allowed"
          ? "Microphone access was blocked. Type your question instead."
          : "Could not hear that. Try again, or type your question."
      );
      stopListening();
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setVoiceError("Could not start voice input. Type your question instead.");
    }
  }, [lang, listening, stopListening, voiceSupported]);

  useEffect(
    () => () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const ask = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      const params = new URLSearchParams({ q });
      if (docs[0]) params.set("doc", docs[0].id);
      window.location.assign(`/assistant?${params.toString()}`);
    },
    [docs]
  );

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(null);
    // The wizard is reached through a real page load, so the bytes are handed
    // over in IndexedDB rather than lost in memory.
    const stored = await setPendingUpload(file);
    if (!stored) {
      setUploadError("This browser could not hand the file to the wizard. Open Upload and choose it there.");
      return;
    }
    window.location.assign("/upload");
  }, []);

  return (
    <WorkspaceLayout
      currentPath="/dashboard"
      title="Dashboard"
      subtitle="One question. Any language. Every opportunity."
    >
      {/* Main assistant workspace */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <Sparkles size={17} className="text-brand" aria-hidden="true" />
            Ask about your documents
          </h2>
          <a href="/assistant" className="text-sm text-link">
            Open the full assistant
          </a>
        </div>
        <p className="mb-3 text-[0.8rem] text-subtle">
          {docs[0]
            ? `Using your most recent document: ${docs[0].title}. Answers come only from your documents.`
            : "Read a document first, then ask anything about it. Answers come only from the document."}
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          rows={3}
          placeholder="What do you want to know?"
          aria-label="Ask a question about your documents"
          className="block w-full resize-y rounded-md border border-input bg-input-bg px-3 py-2 text-sm text-text"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ask(question)}
            disabled={!question.trim()}
            className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse disabled:opacity-50"
          >
            Ask <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={startVoice}
            aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Ask by voice"}
            className={`touch-target inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${
              listening ? "border-brand bg-brand text-inverse" : "border-input bg-background text-text"
            }`}
          >
            {listening ? <Square size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
            {listening ? "Stop" : "Speak"}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
                className="touch-target rounded-full border border-input bg-background px-2.5 py-1 text-[0.75rem] text-subtle"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {voiceError && (
          <p role="alert" className="mt-2 text-[0.75rem] text-warning">
            {voiceError}
          </p>
        )}
      </section>

      {/* Inline upload + one-tap voice + accessibility shortcut */}
      <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-xl border-2 border-dashed p-4 lg:col-span-2 ${
            dragging ? "border-brand bg-selected" : "border-input bg-surface-muted"
          }`}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Upload size={16} aria-hidden="true" /> Read a document
          </h2>
          <p className="mt-1 text-[0.8rem] text-subtle">
            Drop a photo, PDF or text file here. It goes straight to the step-by-step upload, and the original is
            kept beside the explanation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="touch-target rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse"
            >
              Choose a file
            </button>
            <a
              href="/upload"
              className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-text"
            >
              Paste text or use a link
            </a>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {uploadError && (
            <p role="alert" className="mt-2 text-[0.75rem] text-danger">
              {uploadError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/voice"
            className="touch-target flex flex-1 items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-inverse">
              <Volume2 size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-medium text-text">One-tap voice</span>
              <span className="block text-[0.8rem] text-subtle">Hear a document read aloud, or read any text.</span>
            </span>
          </a>
          <div className="rounded-xl border border-border bg-surface p-3">
            <button
              type="button"
              onClick={() => setA11yOpen((v) => !v)}
              aria-expanded={a11yOpen}
              aria-controls="dashboard-a11y"
              className="touch-target flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-text"
            >
              <span className="flex items-center gap-2">
                <Accessibility size={17} aria-hidden="true" /> Accessibility settings
              </span>
              <span className="text-[0.75rem] text-subtle">{a11yOpen ? "Close" : "Open"}</span>
            </button>
            {a11yOpen && (
              <div id="dashboard-a11y" className="mt-3 border-t border-border pt-3">
                <A11yControls compact />
                <a href="/settings" className="mt-3 inline-block text-[0.8rem] text-link">
                  More settings
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-semibold text-text">More tools</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.href}
                href={action.href}
                className="touch-target flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-inverse">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-text">{action.label}</span>
                  <span className="text-[0.8rem] text-subtle">{action.hint}</span>
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-semibold text-text">Your language</h2>
        <p className="text-[0.8rem] text-subtle">
          Everything you read and hear uses this language unless you change it for one document.
        </p>
        <LanguageChips
          value={lang}
          onChange={(code) => {
            setLang(code);
            saveLastLanguage(code);
          }}
        />
      </section>

      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Recent documents</h2>
          <a href="/library" className="text-sm text-link">
            See all
          </a>
        </div>
        {docs.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <FileText size={18} className="mb-2" aria-hidden="true" />
            <p>
              Nothing saved yet. Documents you read are kept on this device only — no account, no upload of your
              history.
            </p>
            <a href="/upload" className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse">
              Read your first document
            </a>
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onOpenDoc(doc)}
                  className="touch-target flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-brand"
                >
                  <FileText size={18} className="shrink-0 text-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{doc.title}</span>
                    <span className="block text-[0.75rem] text-subtle">
                      {doc.category} · {doc.lang} · {new Date(doc.updatedAt).toLocaleString()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Recent conversations</h2>
          <a href="/history" className="inline-flex items-center gap-1 text-sm text-link">
            <HistoryIcon size={13} aria-hidden="true" /> See all
          </a>
        </div>
        {convos.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <MessageSquare size={18} className="mb-2" aria-hidden="true" />
            No conversations yet. Ask a question about any document and it is saved here with a summary.
          </p>
        ) : (
          <ul className="space-y-2">
            {convos.map((convo) => (
              <li key={convo.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-text">
                  <MessageSquare size={16} aria-hidden="true" />
                  {convo.docTitle || "General question"}
                </p>
                <p className="mt-1 text-[0.8rem] text-subtle">{convo.summary}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.7rem] text-subtlest">
                  <Clock size={11} aria-hidden="true" />
                  {new Date(convo.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WorkspaceLayout>
  );
}
