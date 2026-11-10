import { useEffect, useMemo, useState } from "react";
import { Target, CalendarClock, FileCheck2 } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { EligibilityCheck } from "../components/result/EligibilityCheck.tsx";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";

export interface OpportunityProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

export function Opportunity({ lang, activeDoc }: OpportunityProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) setDocId(activeDoc.id);
  }, [activeDoc?.id]);

  const doc = useMemo(() => docs.find((d) => d.id === docId) ?? activeDoc ?? null, [docs, docId, activeDoc]);

  return (
    <WorkspaceLayout
      currentPath="/opportunity"
      title="Opportunity Access"
      subtitle="Scholarships, jobs, grants and fellowships: what the document asks for, and where you stand."
    >
      <div className="space-y-4">
        <DocumentPicker docs={docs} value={docId} onChange={setDocId} />

        {!doc ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <Target size={16} className="mb-1 inline" aria-hidden="true" />
            Choose a saved opportunity document, or read one first.
          </p>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
                <FileCheck2 size={16} aria-hidden="true" /> What this document asks for
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-subtle">Requirements</h3>
                  <ul className="mt-1 space-y-1 text-sm text-text">
                    {doc.result.eligibility.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                    {doc.result.eligibility.length === 0 && (
                      <li className="text-subtle">This document does not publish eligibility requirements.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-subtle">How to apply</h3>
                  <ol className="mt-1 space-y-1 text-sm text-text">
                    {doc.result.howToApply.map((c, i) => (
                      <li key={i}>{i + 1}. {c}</li>
                    ))}
                    {doc.result.howToApply.length === 0 && (
                      <li className="text-subtle">This document does not say how to apply.</li>
                    )}
                  </ol>
                </div>
              </div>
            </section>

            {doc.result.deadlines.length > 0 && (
              <section className="rounded-lg border border-border bg-surface p-4">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
                  <CalendarClock size={16} aria-hidden="true" /> When it closes
                </h2>
                <ul className="space-y-1 text-sm">
                  {doc.result.deadlines.map((d) => (
                    <li key={d.id}>
                      <span className="font-medium text-text">{d.label}</span>{" "}
                      <span className="text-subtle">{d.originalValue ?? "not stated"}</span>
                      {d.verified ? (
                        <span className="ml-1 text-success">✓ verified in the original</span>
                      ) : (
                        <span className="ml-1 text-warning">⚠ check the original</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <EligibilityCheck
              sourceText={doc.sourceText}
              result={{ originalText: doc.result.originalText, eligibility: doc.result.eligibility }}
              lang={doc.result.lang || lang}
            />
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
