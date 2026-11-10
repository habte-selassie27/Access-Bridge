import { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, Search, Trash2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { listConversations, removeConversation } from "../lib/library.ts";
import type { ConversationRecord } from "../lib/library.ts";

/**
 * History is its own place, not a tab inside the Document Center.
 *
 * Each thread starts with a deterministic summary, so the reader can find the
 * conversation they remember without opening every one. The full messages are
 * still there, unchanged.
 */
export function History() {
  const [convos, setConvos] = useState<ConversationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setConvos(listConversations());
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) =>
      [c.summary, c.docTitle, ...c.messages.map((m) => m.content)].join(" ").toLowerCase().includes(q)
    );
  }, [convos, query]);

  return (
    <WorkspaceLayout
      currentPath="/history"
      title="History"
      subtitle="Every conversation you have had with a document, summarised and kept on this device."
    >
      <div className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search summaries, documents and answers"
            className="textfield pl-9"
          />
        </label>
        <p className="text-[0.75rem] text-subtle">
          {convos.length} conversation{convos.length === 1 ? "" : "s"} stored in this browser. Nothing is uploaded.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <MessageSquare size={24} className="mx-auto mb-2 text-subtle" aria-hidden="true" />
          <p className="text-sm text-subtle">
            {convos.length === 0
              ? "No conversations yet. Ask a question about a document and it appears here."
              : "Nothing matched that search."}
          </p>
          <a href="/assistant" className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse">
            Open the Assistant
          </a>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((convo) => {
            const open = expanded === convo.id;
            const firstQuestion = convo.messages.find((m) => m.role === "user")?.content ?? "";
            return (
              <li key={convo.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {convo.docTitle || "General question"}
                    </p>
                    <p className="mt-1 text-sm text-text">{convo.summary}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem] text-subtlest">
                      <Clock size={11} aria-hidden="true" />
                      {new Date(convo.createdAt).toLocaleString()} · {convo.messages.length} message
                      {convo.messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeConversation(convo.id);
                      setConvos(listConversations());
                    }}
                    className="icon-btn shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : convo.id)}
                    aria-expanded={open}
                    className="touch-target inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-[0.8rem] text-text"
                  >
                    {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {open ? "Hide conversation" : "Read conversation"}
                  </button>
                  <a
                    href={`/assistant?doc=${encodeURIComponent(convo.docId ?? "")}${firstQuestion ? `&q=${encodeURIComponent(firstQuestion)}` : ""}`}
                    className="touch-target inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-[0.8rem] text-text"
                  >
                    Continue in Assistant <ArrowRight size={13} aria-hidden="true" />
                  </a>
                </div>

                {open && (
                  <ol className="mt-3 space-y-2 border-t border-border pt-3">
                    {convo.messages.map((m, i) => (
                      <li key={i} className="rounded-md border border-border bg-background p-2 text-[0.8rem]">
                        <p className="font-medium text-text">{m.role === "user" ? "You" : "AccessBridge"}</p>
                        <p className="whitespace-pre-wrap text-subtle">{m.content}</p>
                        {m.quote && <p className="mt-1 border-l-2 border-border pl-2 italic text-subtle">“{m.quote}”</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-[0.75rem] text-subtle">
        History follows the profile you are using. Signing in scopes it to that profile on this device.
      </p>
    </WorkspaceLayout>
  );
}
