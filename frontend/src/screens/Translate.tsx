import { useEffect, useMemo, useState } from "react";
import { Languages, History, Trash2 } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { SegmentedControl } from "../components/common/SegmentedControl.tsx";
import { translateText } from "../lib/api/workspace.ts";
import { listDocs } from "../lib/library.ts";
import { scopedKey } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";
import { isRtl } from "../lib/languages.ts";

interface HistoryEntry {
  id: string;
  at: number;
  lang: LangCode;
  original: string;
  translated: string;
}

const HISTORY_KEY = "pastewise-translation-history";

/** History is scoped to the profile, like the library. */
function historyKey(): string {
  return scopedKey(HISTORY_KEY);
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey());
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(historyKey(), JSON.stringify(entries.slice(0, 30)));
  } catch {
    // ignore
  }
}

export interface TranslateProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

export function Translate({ lang, activeDoc }: TranslateProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");
  const [target, setTarget] = useState<LangCode>(lang);
  /** Whole document, paragraph by paragraph, or sentence by sentence. */
  const [mode, setMode] = useState<"document" | "paragraph" | "sentence">("document");
  const [segments, setSegments] = useState<{ original: string; translated: string }[]>([]);
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory());

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) setDocId(activeDoc.id);
  }, [activeDoc?.id]);

  const doc = useMemo(() => docs.find((d) => d.id === docId) ?? activeDoc ?? null, [docs, docId, activeDoc]);

  useEffect(() => {
    if (doc && !text) setText(doc.sourceText);
  }, [doc, text]);

  const run = async () => {
    if (!text.trim()) {
      setError("Paste or open a document to translate.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await translateText(text, target, "en", mode);
    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }
    const result = res.data;
    setTranslated(result?.translated ?? "");
    setSegments(result?.segments ?? []);
    if (result) {
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        at: Date.now(),
        lang: target,
        original: result.original,
        translated: result.translated,
      };
      const next = [entry, ...loadHistory()].slice(0, 30);
      saveHistory(next);
      setHistory(next);
    }
    setLoading(false);
  };

  return (
    <WorkspaceLayout
      currentPath="/translate"
      title="Translate"
      subtitle="Read a document in your own language, side by side with the original."
    >
      <div className="space-y-4">
        <DocumentPicker docs={docs} value={docId} onChange={setDocId} />
        <div>
          <p className="mb-2 text-sm font-medium text-text">Translate into</p>
          <LanguageChips value={target} onChange={setTarget} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text">How to translate</p>
          <SegmentedControl
            label="Translation mode"
            value={mode}
            onChange={(v) => {
              setMode(v);
              setSegments([]);
            }}
            options={[
              { value: "document", label: "Whole document", hint: "One piece of text" },
              { value: "paragraph", label: "Paragraph by paragraph", hint: "Keeps the shape" },
              { value: "sentence", label: "Sentence by sentence", hint: "Word for word" },
            ]}
            note="Paragraph and sentence mode keep each piece next to its translation, so you can check the original as you read."
          />
        </div>

        <label className="block">
          <span className="form-label">Text to translate</span>
          <textarea
            className="textfield mt-1 block min-h-[9rem] w-full resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a passage, or pick a saved document above."
          />
        </label>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="touch-target w-full rounded-md bg-brand px-5 py-3 text-sm font-medium text-inverse disabled:opacity-60"
        >
          {loading ? "Translating…" : "Translate"}
        </button>

        {error && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
            {error}
          </p>
        )}

        {translated && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-surface p-3">
              <h2 className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-subtle">Original</h2>
              <p className="whitespace-pre-wrap text-sm text-text">{text}</p>
            </section>
            <section
              className="rounded-lg border border-brand bg-surface p-3"
              lang={target}
              dir={isRtl(target) ? "rtl" : "ltr"}
            >
              <h2 className="mb-1 flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-wide text-subtle">
                <Languages size={12} aria-hidden="true" /> Translation
              </h2>
              <p className="whitespace-pre-wrap text-sm text-text">{translated}</p>
            </section>
          </div>
        )}

        {segments.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text">Line by line</h2>
            <ul className="space-y-2">
              {segments.map((segment, i) => (
                <li key={i} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm text-subtle">{segment.original}</p>
                  <p className="mt-1 text-sm text-text" lang={target} dir={isRtl(target) ? "rtl" : "ltr"}>
                    {segment.translated}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <History size={16} aria-hidden="true" /> Translation history
          </h2>
          {history.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
              Nothing translated yet. Past translations stay on this device.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[0.75rem] text-subtle">
                      {entry.lang} · {new Date(entry.at).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = loadHistory().filter((h) => h.id !== entry.id);
                        saveHistory(next);
                        setHistory(next);
                      }}
                      className="icon-btn"
                      aria-label="Delete translation from history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setText(entry.original);
                      setTranslated(entry.translated);
                      setTarget(entry.lang);
                    }}
                    className="mt-1 text-left text-sm text-text hover:underline"
                  >
                    {entry.translated.slice(0, 160)}
                    {entry.translated.length > 160 ? "…" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}
