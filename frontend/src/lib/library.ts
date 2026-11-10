import type { ExplanationResult, LangCode, ExplainLevel } from "./api/types.ts";

/**
 * The Personal Information Library.
 *
 * Everything here lives in the browser only: no account, no server, no upload
 * of the reader's own history. The reader decides what to keep and can delete
 * any entry with one tap, which is what the privacy page promises.
 */
export interface LibraryDoc {
  id: string;
  title: string;
  docType: ExplanationResult["docType"];
  lang: LangCode;
  level: ExplainLevel;
  /** Free-form category the reader can set. */
  category: string;
  createdAt: number;
  updatedAt: number;
  sourceText: string;
  result: ExplanationResult;
}

export interface ConversationRecord {
  id: string;
  docId: string | null;
  docTitle: string;
  createdAt: number;
  messages: { role: "user" | "assistant"; content: string; quote?: string | null }[];
}

const DOCS_KEY = "pastewise-library-docs";
const CONVOS_KEY = "pastewise-library-conversations";
const CHECKLIST_KEY = "pastewise-checklist";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode). The app still works, it just forgets.
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A readable title when the reader did not give one: the first words of the document. */
export function titleFromText(text: string, fallback = "Untitled document"): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  const words = clean.split(" ").slice(0, 7).join(" ");
  return words.length < clean.length ? `${words}…` : words;
}

export function listDocs(): LibraryDoc[] {
  return read<LibraryDoc[]>(DOCS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDoc(id: string): LibraryDoc | undefined {
  return listDocs().find((d) => d.id === id);
}

/** Two reads of the same document should not fill the library with copies. */
function sameDocument(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const left = clean(a);
  const right = clean(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < 80 || right.length < 80) return false;
  return left.slice(0, 400) === right.slice(0, 400);
}

export function saveDoc(input: {
  id?: string;
  title?: string;
  category?: string;
  sourceText: string;
  result: ExplanationResult;
}): LibraryDoc {
  const docs = read<LibraryDoc[]>(DOCS_KEY, []);
  const now = Date.now();
  const existing =
    (input.id ? docs.find((d) => d.id === input.id) : undefined) ??
    docs.find((d) => sameDocument(d.sourceText, input.sourceText));
  const doc: LibraryDoc = {
    id: existing?.id ?? newId("doc"),
    title: input.title?.trim() || existing?.title || titleFromText(input.sourceText),
    docType: input.result.docType,
    lang: input.result.lang,
    level: input.result.level ?? "standard",
    category: input.category ?? existing?.category ?? "Unsorted",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceText: input.sourceText,
    result: input.result,
  };
  const next = existing ? docs.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...docs];
  write(DOCS_KEY, next);
  return doc;
}

export function removeDoc(id: string): void {
  write(DOCS_KEY, read<LibraryDoc[]>(DOCS_KEY, []).filter((d) => d.id !== id));
  write(CONVOS_KEY, read<ConversationRecord[]>(CONVOS_KEY, []).filter((c) => c.docId !== id));
}

export function updateDoc(id: string, patch: Partial<Pick<LibraryDoc, "title" | "category">>): void {
  const docs = read<LibraryDoc[]>(DOCS_KEY, []);
  write(
    DOCS_KEY,
    docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d))
  );
}

export function listCategories(): string[] {
  const set = new Set(listDocs().map((d) => d.category || "Unsorted"));
  return Array.from(set).sort();
}

/** Search across titles, categories and the document body itself. */
export function searchDocs(query: string): LibraryDoc[] {
  const q = query.trim().toLowerCase();
  const docs = listDocs();
  if (!q) return docs;
  return docs.filter((d) =>
    [d.title, d.category, d.sourceText, d.result.summary, ...d.result.documentsToBring]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

/* -------------------------------------------------------------- conversations */

export function listConversations(): ConversationRecord[] {
  return read<ConversationRecord[]>(CONVOS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveConversation(input: {
  id?: string;
  docId: string | null;
  docTitle: string;
  messages: ConversationRecord["messages"];
}): ConversationRecord {
  const convos = read<ConversationRecord[]>(CONVOS_KEY, []);
  const existing = input.id ? convos.find((c) => c.id === input.id) : undefined;
  const convo: ConversationRecord = {
    id: existing?.id ?? newId("convo"),
    docId: input.docId,
    docTitle: input.docTitle,
    createdAt: existing?.createdAt ?? Date.now(),
    messages: input.messages,
  };
  const next = existing ? convos.map((c) => (c.id === convo.id ? convo : c)) : [convo, ...convos];
  write(CONVOS_KEY, next);
  return convo;
}

export function removeConversation(id: string): void {
  write(CONVOS_KEY, read<ConversationRecord[]>(CONVOS_KEY, []).filter((c) => c.id !== id));
}

/* ---------------------------------------------------------------- checklists */

/** Which checklist items the reader has already ticked, per document. */
export function readChecklist(docId: string): Record<string, boolean> {
  return read<Record<string, Record<string, boolean>>>(CHECKLIST_KEY, {})[docId] ?? {};
}

export function writeChecklist(docId: string, itemId: string, done: boolean): void {
  const all = read<Record<string, Record<string, boolean>>>(CHECKLIST_KEY, {});
  const forDoc = { ...(all[docId] ?? {}) };
  if (done) forDoc[itemId] = true;
  else delete forDoc[itemId];
  all[docId] = forDoc;
  write(CHECKLIST_KEY, all);
}

export function clearEverything(): void {
  try {
    localStorage.removeItem(DOCS_KEY);
    localStorage.removeItem(CONVOS_KEY);
    localStorage.removeItem(CHECKLIST_KEY);
  } catch {
    // ignore
  }
}
