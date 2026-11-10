import { useEffect, useMemo, useState } from "react";
import { BookOpen, ArrowLeftRight } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { LevelSelector } from "../components/result/LevelSelector.tsx";
import { simplifyDocument } from "../lib/api/workspace.ts";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { ExplainLevel, LangCode } from "../lib/api/types.ts";
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

  return (
    <WorkspaceLayout
      currentPath="/simplify"
      title="Simplify Mode"
      subtitle="The same document, written three ways. Pick the one that works for you."
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
