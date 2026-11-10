import { useEffect, useMemo, useState } from "react";
import { GitCompare } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { compareDocuments } from "../lib/api/workspace.ts";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { ComparisonResult, LangCode } from "../lib/api/types.ts";

export interface CompareProps {
  lang: LangCode;
}

export function Compare({ lang }: CompareProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  const docA = useMemo(() => docs.find((d) => d.id === idA), [docs, idA]);
  const docB = useMemo(() => docs.find((d) => d.id === idB), [docs, idB]);

  const run = async () => {
    if (!docA || !docB) {
      setError("Choose two documents to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await compareDocuments(docA.sourceText, docB.sourceText, lang);
    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }
    setResult(res.data ?? null);
    setLoading(false);
  };

  const section = (title: string, items: string[], tone: string) => (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className={`mb-2 text-sm font-semibold ${tone}`}>{title}</h3>
      <ul className="space-y-1 text-sm text-text">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
        {items.length === 0 && <li className="text-subtle">Nothing to report.</li>}
      </ul>
    </section>
  );

  return (
    <WorkspaceLayout
      currentPath="/compare"
      title="Compare documents"
      subtitle="Two versions of the same announcement: what changed, and what did not."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DocumentPicker docs={docs} value={idA} onChange={setIdA} label="First document" />
          <DocumentPicker docs={docs} value={idB} onChange={setIdB} label="Second document" />
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading || !docA || !docB}
          className="touch-target w-full rounded-md bg-brand px-5 py-3 text-sm font-medium text-inverse disabled:opacity-60"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>

        {error && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-text">
              <GitCompare size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
              {result.summary}
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {section(`Only in ${docA?.title ?? "the first document"}`, result.onlyInA, "text-danger")}
              {section(`Only in ${docB?.title ?? "the second document"}`, result.onlyInB, "text-danger")}
              {section("Different in both", result.differences, "text-warning")}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
