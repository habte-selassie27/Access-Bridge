import { useEffect, useState } from "react";
import {
  Upload,
  Languages,
  Volume2,
  ListChecks,
  Target,
  FileText,
  MessageSquare,
  Clock,
} from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { listDocs, listConversations } from "../lib/library.ts";
import type { LibraryDoc, ConversationRecord } from "../lib/library.ts";
import { loadLastLanguage, saveLastLanguage } from "../lib/languages.ts";
import type { LanguageCode } from "../lib/languages.ts";

const QUICK_ACTIONS = [
  { href: "/upload", label: "Analyze document", hint: "Upload and understand any document.", icon: Upload },
  { href: "/translate", label: "Translate", hint: "Read a document in another language.", icon: Languages },
  { href: "/voice", label: "Voice assistant", hint: "Ask questions by speaking.", icon: Volume2 },
  { href: "/actions", label: "Action guide", hint: "Turn the information into tasks.", icon: ListChecks },
  { href: "/opportunity", label: "Opportunity check", hint: "See if you meet the requirements.", icon: Target },
];

export interface DashboardProps {
  onOpenDoc: (doc: LibraryDoc) => void;
}

export function Dashboard({ onOpenDoc }: DashboardProps) {
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [convos, setConvos] = useState<ConversationRecord[]>([]);

  useEffect(() => {
    setDocs(listDocs().slice(0, 5));
    setConvos(listConversations().slice(0, 5));
  }, []);

  return (
    <WorkspaceLayout
      currentPath="/dashboard"
      title="Dashboard"
      subtitle="One question. Any language. Every opportunity."
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">What do you want to do?</h2>
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
        <h2 className="text-base font-semibold text-text">Recent conversations</h2>
        {convos.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <MessageSquare size={18} className="mb-2" aria-hidden="true" />
            No conversations yet. Ask a question about any document and it is saved here.
          </p>
        ) : (
          <ul className="space-y-2">
            {convos.map((convo) => (
              <li key={convo.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-text">
                  <MessageSquare size={16} aria-hidden="true" />
                  {convo.docTitle || "General question"}
                </p>
                <p className="mt-1 text-[0.8rem] text-subtle">{convo.messages[0]?.content}</p>
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
