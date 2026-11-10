import { useEffect, useMemo, useState } from "react";
import { BookOpen, ArrowLeftRight, Search } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { LevelSelector } from "../components/result/LevelSelector.tsx";
import { simplifyDocument, buildGlossary } from "../lib/api/workspace.ts";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { ExplainLevel, GlossaryResult, LangCode } from "../lib/api/types.ts";
import { isRtl } from "../lib/languages.ts";

export interface SimplifyProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

export function Simplify({ lang, activeDoc }: SimplifyProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");
  const [level, setLevel] = useState<ExplainLevel>("simple");
  const [result, setResult] = useState<{ summary: string; steps: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The glossary tool.
  const [terms, setTerms] = useState("");
  const [glossary, setGlossary] = useState<GlossaryResult | null>(null);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) setDocId(activeDoc.id);
  }, [activeDoc?.id]);

  const doc = useMemo(() => docs.find((d) => d.id === docId) ?? activeDoc ?? null, [docs, docId, activeDoc]);

  const run = async (chosen: ExplainLevel) => {
    if (!doc) {
      setError("Choose a document first.");
      return;
    }
    setLevel(chosen);
    setLoading(true);
    setError(null);
    const res = await simplifyDocument(doc.sourceText, doc.result.lang || lang, chosen);
    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }
    const data = res.data;
    setResult({
      summary: data?.summary ?? "",
      steps: (data?.actions ?? []).map((a) => a.step),
    });
    setLoading(false);
  };

  const runGlossary = async () => {
    if (!doc) {
      setGlossaryError("Choose a document first.");
      return;
    }
    setGlossaryLoading(true);
    setGlossaryError(null);
    const requested = terms
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await buildGlossary(doc.sourceText, doc.result.lang || lang, requested);
    if (res.error) {
      setGlossaryError(res.error.message);
      setGlossaryLoading(false);
      return;
    }
    setGlossary(res.data ?? null);
    setGlossaryLoading(false);
  };

  return (
    <WorkspaceLayout
      currentPath="/simplify"
      title="Simplify Mode"
      subtitle="The same document, written three ways — and the hard words explained."
    >
      <div className="space-y-4">
        <DocumentPicker docs={docs} value={docId} onChange={setDocId} />

        {doc ? (
          <>
            <LevelSelector value={level} onChange={run} disabled={loading} />

            {loading && <p className="text-sm text-subtle">Rewriting the document…</p>}
            {error && (
              <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
                {error}
              </p>
            )}

            {result && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                    <ArrowLeftRight size={16} aria-hidden="true" /> Original explanation
                  </h2>
                  <p className="text-sm text-text">{doc.result.summary}</p>
                  <ol className="mt-2 space-y-1 text-sm text-subtle">
                    {doc.result.actions.map((a) => (
                      <li key={a.id}>{a.step}</li>
                    ))}
                  </ol>
                </section>
                <section
                  className="rounded-lg border border-brand bg-surface p-4"
                  dir={isRtl(doc.result.lang) ? "rtl" : "ltr"}
                >
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                    <BookOpen size={16} aria-hidden="true" /> {level === "simple" ? "Simple" : level === "detailed" ? "Detailed" : "Standard"} version
                  </h2>
                  <p className="text-sm text-text">{result.summary}</p>
                  <ol className="mt-2 space-y-1 text-sm text-subtle">
                    {result.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[0.75rem] text-subtlest">
                    Every date and amount was checked against the original document again, so nothing changed except
                    the wording.
                  </p>
                </section>
              </div>
            )}

            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
                <Search size={16} aria-hidden="true" /> Explain the hard words
              </h2>
              <p className="mb-3 text-[0.8rem] text-subtle">
                Leave the box empty and we will pick the hardest words in the document, or type the ones you do not
                understand.
              </p>
              <label className="block">
                <span className="sr-only">Words to explain</span>
                <input
                  className="textfield"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="For example: accredited institution, attested transcript"
                />
              </label>
              <button
                type="button"
                onClick={runGlossary}
                disabled={glossaryLoading}
                className="touch-target mt-3 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-inverse disabled:opacity-60"
              >
                {glossaryLoading ? "Explaining…" : "Explain these words"}
              </button>

              {glossaryError && (
                <p role="alert" className="mt-3 rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
                  {glossaryError}
                </p>
              )}

              {glossary && (
                <div className="mt-4 space-y-2">
                  {glossary.entries.length === 0 && (
                    <p className="text-sm text-subtle">No difficult words found in this document.</p>
                  )}
                  {glossary.entries.map((entry, i) => (
                    <div key={i} className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm font-semibold text-text">{entry.term}</p>
                      <p className="text-sm text-subtle" lang={glossary.lang} dir={isRtl(glossary.lang) ? "rtl" : "ltr"}>
                        {entry.meaning}
                      </p>
                      {entry.quote && (
                        <p className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtlest">
                          “{entry.quote}”
                        </p>
                      )}
                    </div>
                  ))}
                  {glossary.examples.length > 0 && (
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm font-semibold text-text">In practice</p>
                      <ul className="mt-1 space-y-1 text-sm text-subtle">
                        {glossary.examples.map((example, i) => (
                          <li key={i}>• {example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            Choose a saved document, or read one first.
          </p>
        )}
      </div>
    </WorkspaceLayout>
  );
}
