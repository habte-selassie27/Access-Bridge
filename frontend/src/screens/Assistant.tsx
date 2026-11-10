import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, FileText, Sparkles } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { MessageInput } from "../components/followup/MessageInput.tsx";
import { listDocs, saveConversation } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";

const SUGGESTIONS = [
  "Explain this document like I am a beginner.",
  "What are the most important requirements?",
  "What happens if I miss the deadline?",
  "Which documents should I prepare first?",
  "How much do I have to pay, and when?",
];

export interface AssistantProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  quote?: string | null;
}

export function Assistant({ lang, activeDoc }: AssistantProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState<string>(activeDoc?.id ?? "");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id && !docId) setDocId(activeDoc.id);
  }, [activeDoc?.id, docId]);

  const doc = docs.find((d) => d.id === docId) ?? activeDoc ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setInput("");
      setError(null);
      setLoading(true);
      setMessages((m) => [...m, { role: "user", content: q }]);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceText: doc?.sourceText ?? doc?.result.originalText ?? "",
            result: doc?.result ?? null,
            question: q,
            language: lang,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const json = await res.json().catch(() => null);
        if (!json || json.ok !== true) {
          throw new Error((typeof json?.error === "string" ? json.error : json?.error?.message) || "The request failed.");
        }
        const answer = json.data.notFound
          ? "This is not in your document. Please ask the issuing office."
          : json.data.answer;
        setMessages((m) => [...m, { role: "assistant", content: answer, quote: json.data.sourceQuote ?? null }]);
        saveConversation({
          docId: doc?.id ?? null,
          docTitle: doc?.title ?? "General question",
          messages: [...messages, { role: "user", content: q }, { role: "assistant", content: answer }],
        });
      } catch (e: any) {
        const message = e?.message || "We could not answer right now.";
        setError(message);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "We could not answer that right now. Please ask the issuing office." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [doc, lang, messages]
  );

  return (
    <WorkspaceLayout
      currentPath="/assistant"
      title="AI Assistant"
      subtitle="Ask anything about a document. Answers come only from the document."
    >
      <div className="space-y-4">
        <label className="block">
          <span className="form-label">Document to talk about</span>
          <select
            className="textfield mt-1"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
          >
            <option value="">No document selected</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>

        {doc ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
            <FileText size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-text">{doc.title}</p>
              <p className="truncate text-[0.75rem] text-subtle">{doc.result.summary}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-warning-border bg-warning-bg p-3 text-sm text-warning">
            <Sparkles size={15} className="mb-1 inline" aria-hidden="true" />
            Read a document first, then ask questions about it. Every answer is checked against the original text.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={!doc || loading}
              className="touch-target rounded-full border border-input bg-background px-3 py-1.5 text-sm text-text disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
              <MessageSquare size={16} aria-hidden="true" />
              Your questions and answers are saved on this device so you can come back to them.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${
                m.role === "user" ? "border-brand bg-brand/10 text-text" : "border-border bg-surface text-text"
              }`}
            >
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-subtle">
                {m.role === "user" ? "You" : "AccessBridge"}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.quote && <p className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtle">“{m.quote}”</p>}
            </div>
          ))}
          {loading && <p className="text-sm text-subtle">Reading the document…</p>}
          {error && (
            <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <MessageInput
          value={input}
          onChange={setInput}
          onSend={() => ask(input)}
          disabled={loading || !doc}
          lang={lang}
        />
      </div>
    </WorkspaceLayout>
  );
}
