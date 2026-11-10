import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, FileText, Sparkles, Volume2, Square } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { MessageInput } from "../components/followup/MessageInput.tsx";
import { listDocs, saveConversation } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";
import { isRtl } from "../lib/languages.ts";

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
  /** Several documents can be open at once and talked about together. */
  const [selected, setSelected] = useState<string[]>(activeDoc ? [activeDoc.id] : []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) {
      setSelected((current) => (current.includes(activeDoc.id) ? current : [...current, activeDoc.id]));
    }
  }, [activeDoc?.id]);

  const chosen = useMemo(
    () => docs.filter((d) => selected.includes(d.id)),
    [docs, selected]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const toggleDoc = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id]
    );
  };

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
            // Every open document is sent; the server picks the parts that
            // match the question.
            documents: chosen.map((d) => ({ title: d.title, text: d.sourceText })),
            sourceText: chosen.length === 1 ? chosen[0].sourceText : "",
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
          docId: chosen.length === 1 ? chosen[0].id : null,
          docTitle: chosen.length === 1 ? chosen[0].title : `${chosen.length} documents`,
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
    [chosen, lang, messages]
  );

  /** Read one answer out loud. */
  const speak = (index: number, content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking === index) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = lang;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    utteranceRef.current = utterance;
    setSpeaking(index);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <WorkspaceLayout
      currentPath="/assistant"
      title="AI Assistant"
      subtitle="Ask anything about your documents. Answers come only from the documents."
    >
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-2 text-sm font-medium text-text">
            Documents to talk about
            {chosen.length > 1 && <span className="text-subtle"> ({chosen.length} open)</span>}
          </p>
          {docs.length === 0 ? (
            <p className="text-sm text-subtle">No documents saved yet. Read one first.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {docs.map((doc) => {
                const isSelected = selected.includes(doc.id);
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggleDoc(doc.id)}
                      className={`touch-target flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors ${
                        isSelected ? "border-brand bg-brand/10" : "border-input bg-background hover:bg-neutral-subtle-hovered"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.6rem] ${
                          isSelected ? "border-brand bg-brand text-inverse" : "border-input"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8rem] font-medium text-text">{doc.title}</span>
                        <span className="block truncate text-[0.7rem] text-subtle">
                          {doc.category} · {doc.lang}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {chosen.length > 1 && (
            <p className="mt-2 text-[0.75rem] text-subtle">
              Questions are answered from every open document. The answer says which document each fact comes from.
            </p>
          )}
        </section>

        {chosen.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
            <FileText size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-text">
                {chosen.length === 1 ? chosen[0].title : `${chosen.length} documents open`}
              </p>
              {chosen.length === 1 && (
                <p className="truncate text-[0.75rem] text-subtle">{chosen[0].result.summary}</p>
              )}
            </div>
          </div>
        )}

        {chosen.length === 0 && (
          <p className="rounded-lg border border-warning-border bg-warning-bg p-3 text-sm text-warning">
            <Sparkles size={15} className="mb-1 inline" aria-hidden="true" />
            Open a document first, then ask questions about it. Every answer is checked against the original text.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={chosen.length === 0 || loading}
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
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-subtle">
                  {m.role === "user" ? "You" : "AccessBridge"}
                </p>
                {m.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => speak(i, m.content)}
                    aria-pressed={speaking === i}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[0.7rem] text-subtle hover:bg-neutral-subtle-hovered"
                    aria-label={speaking === i ? "Stop reading this answer" : "Read this answer out loud"}
                  >
                    {speaking === i ? (
                      <Square size={11} aria-hidden="true" />
                    ) : (
                      <Volume2 size={11} aria-hidden="true" />
                    )}
                    {speaking === i ? "Stop" : "Listen"}
                  </button>
                )}
              </div>
              {/* Answers are written in the target language; the label above stays
                  in the interface language. */}
              <p className="whitespace-pre-wrap" lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"}>
                {m.content}
              </p>
              {m.quote && (
                <p
                  className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtle"
                  lang={lang}
                  dir={isRtl(lang) ? "rtl" : "ltr"}
                >
                  “{m.quote}”
                </p>
              )}
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
          disabled={loading || chosen.length === 0}
          lang={lang}
        />
      </div>
    </WorkspaceLayout>
  );
}
