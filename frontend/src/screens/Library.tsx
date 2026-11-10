import { useEffect, useMemo, useState } from "react";
import { Search, FolderOpen, MessageSquare, Trash2, Pencil, Clock } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { SegmentedControl } from "../components/common/SegmentedControl.tsx";
import {
  listDocs,
  listConversations,
  searchDocs,
  removeDoc,
  removeConversation,
  updateDoc,
  listCategories,
} from "../lib/library.ts";
import type { LibraryDoc, ConversationRecord } from "../lib/library.ts";

export interface LibraryProps {
  onOpenDoc: (doc: LibraryDoc) => void;
}

type Tab = "documents" | "history";

export function Library({ onOpenDoc }: LibraryProps) {
  const [tab, setTab] = useState<Tab>("documents");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [convos, setConvos] = useState<ConversationRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState("");

  useEffect(() => {
    setDocs(listDocs());
    setConvos(listConversations());
  }, []);

  const categories = useMemo(() => ["All", ...listCategories()], [docs]);

  const visible = useMemo(() => {
    const base = query.trim() ? searchDocs(query) : listDocs();
    return category === "All" ? base : base.filter((d) => (d.category || "Unsorted") === category);
  }, [query, category, docs]);

  const startEditing = (doc: LibraryDoc) => {
    setEditing(doc.id);
    setDraftTitle(doc.title);
    setDraftCategory(doc.category);
  };

  const saveEditing = (id: string) => {
    updateDoc(id, { title: draftTitle.trim() || undefined, category: draftCategory.trim() || undefined });
    setDocs(listDocs());
    setEditing(null);
  };

  return (
    <WorkspaceLayout
      currentPath="/library"
      title="Document Center"
      subtitle="Everything you have read, kept on this device only."
    >
      <SegmentedControl
        label="Library view"
        value={tab}
        onChange={(v) => setTab(v)}
        options={[
          { value: "documents", label: "Documents", hint: `${docs.length} saved` },
          { value: "history", label: "Conversations", hint: `${convos.length} saved` },
        ]}
        className="mb-4"
      />

      {tab === "documents" ? (
        <>
          <div className="mb-4 space-y-3">
            <label className="relative block">
              <span className="sr-only">Search your documents</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, categories and document text"
                className="textfield pl-9"
              />
            </label>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`touch-target rounded-full border px-3 py-1.5 text-sm ${
                      category === c ? "border-brand bg-brand text-inverse" : "border-input bg-background text-subtle"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center">
              <FolderOpen size={24} className="mx-auto mb-2 text-subtle" aria-hidden="true" />
              <p className="text-sm text-subtle">
                {docs.length === 0
                  ? "No documents yet. Read one and it will be saved here."
                  : "Nothing matched that search."}
              </p>
              {docs.length === 0 && (
                <a href="/upload" className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse">
                  Read a document
                </a>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((doc) => (
                <li key={doc.id} className="rounded-lg border border-border bg-surface p-3">
                  {editing === doc.id ? (
                    <div className="space-y-2">
                      <label className="block">
                        <span className="form-label">Title</span>
                        <input
                          className="textfield mt-1"
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="form-label">Category</span>
                        <input
                          className="textfield mt-1"
                          value={draftCategory}
                          onChange={(e) => setDraftCategory(e.target.value)}
                          placeholder="For example: Scholarships"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditing(doc.id)}
                          className="touch-target rounded-md bg-brand px-4 py-2 text-sm text-inverse"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenDoc(doc)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium text-text">{doc.title}</span>
                        <span className="block text-[0.75rem] text-subtle">
                          {doc.category} · {doc.lang} · {new Date(doc.updatedAt).toLocaleString()}
                        </span>
                        <span className="mt-1 block truncate text-[0.75rem] text-subtlest">
                          {doc.result.summary}
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(doc)}
                          className="icon-btn"
                          aria-label={`Rename ${doc.title}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeDoc(doc.id);
                            setDocs(listDocs());
                            setConvos(listConversations());
                          }}
                          className="icon-btn"
                          aria-label={`Delete ${doc.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {convos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center">
              <MessageSquare size={24} className="mx-auto mb-2 text-subtle" aria-hidden="true" />
              <p className="text-sm text-subtle">No conversations yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {convos.map((convo) => (
                <li key={convo.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{convo.docTitle || "General question"}</p>
                      <p className="flex items-center gap-1 text-[0.7rem] text-subtlest">
                        <Clock size={11} aria-hidden="true" />
                        {new Date(convo.createdAt).toLocaleString()}
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
                  <ol className="mt-2 space-y-1">
                    {convo.messages.map((m, i) => (
                      <li key={i} className="text-[0.8rem]">
                        <span className="font-medium text-text">{m.role === "user" ? "You" : "AccessBridge"}: </span>
                        <span className="text-subtle">{m.content}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </WorkspaceLayout>
  );
}
