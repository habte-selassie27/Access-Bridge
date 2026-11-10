import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Languages, ListTree, MessageSquare, Volume2 } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { OriginalDocumentViewer } from "../components/evidence/OriginalDocumentViewer.tsx";
import { OriginalFileViewer } from "../components/evidence/OriginalFileViewer.tsx";
import { ListenButton } from "../components/audio/ListenButton.tsx";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import { isRtl } from "../lib/languages.ts";

export interface ReaderProps {
  activeDoc: LibraryDoc | null;
  onOpenDoc: (doc: LibraryDoc) => void;
}

type View = "side-by-side" | "analysis";

export function Reader({ activeDoc, onOpenDoc }: ReaderProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");
  const [view, setView] = useState<View>("side-by-side");

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) {
      setDocId(activeDoc.id);
      onOpenDoc(activeDoc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.id]);

  const doc = useMemo(() => docs.find((d) => d.id === docId) ?? activeDoc ?? null, [docs, docId, activeDoc]);

  const spoken =
    doc && [
      doc.result.summary,
      ...doc.result.actions.map((a) => a.step),
      ...doc.result.documentsToBring,
    ].join(". ");

  return (
    <WorkspaceLayout
      currentPath="/library"
      title="Document Reader"
      subtitle="The original next to the explanation, so you can always check."
    >
      <div className="space-y-4">
        <DocumentPicker docs={docs} value={docId} onChange={setDocId} />

        {!doc ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <FileText size={24} className="mx-auto mb-2 text-subtle" aria-hidden="true" />
            <p className="text-sm text-subtle">Choose a document, or read a new one to get started.</p>
            <a href="/upload" className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-inverse">
              Read a document
            </a>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {(["side-by-side", "analysis"] as View[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`touch-target rounded-md border px-3 py-2 text-sm ${
                      view === v ? "border-brand bg-brand text-inverse" : "border-input bg-background text-text"
                    }`}
                  >
                    {v === "side-by-side" ? "Original vs explanation" : "Analysis only"}
                  </button>
                ))}
              </div>
              {spoken && <ListenButton text={spoken} lang={doc.result.lang} demoId={doc.result.demoId} />}
            </div>

            {view === "side-by-side" ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section
                  className="rounded-lg border border-border bg-surface p-4"
                  lang={doc.result.originalLanguage}
                  dir={isRtl(doc.result.originalLanguage) ? "rtl" : "ltr"}
                >
                  <h2 className="mb-2 text-sm font-semibold text-text">Original document</h2>
                  {doc.originalFile ? (
                    <div className="mb-4">
                      <OriginalFileViewer file={doc.originalFile} />
                    </div>
                  ) : (
                    <p className="mb-3 rounded-md border border-border bg-surface-muted p-2 text-[0.75rem] text-subtle">
                      This explanation was made from pasted text, so there is no uploaded file to show. Use the
                      extracted text below as the source of truth.
                    </p>
                  )}
                  <h3 className="mb-1 text-[0.8rem] font-semibold uppercase tracking-wide text-subtle">
                    Extracted text
                  </h3>
                  <OriginalDocumentViewer
                    enabled={false}
                    originalText={doc.sourceText}
                    highlights={[
                      ...doc.result.deadlines.flatMap((d) =>
                        d.evidence ? [{ label: d.label, source: d.evidence.quote }] : []
                      ),
                      ...doc.result.costs.flatMap((c) =>
                        c.evidence ? [{ label: c.label, source: c.evidence.quote }] : []
                      ),
                    ]}
                  />
                </section>

                <section
                  className="rounded-lg border border-border bg-surface p-4"
                  lang={doc.result.lang}
                  dir={isRtl(doc.result.lang) ? "rtl" : "ltr"}
                >
                  <h2 className="mb-2 text-sm font-semibold text-text">Explanation</h2>
                  <p className="text-sm text-text">{doc.result.summary}</p>
                  <ol className="mt-3 space-y-2">
                    {doc.result.actions.map((a) => (
                      <li key={a.id} className="text-sm text-text">
                        {a.urgent && <span aria-hidden="true">⚠️ </span>}
                        {a.step}
                      </li>
                    ))}
                  </ol>
                  {doc.result.documentsToBring.length > 0 && (
                    <>
                      <h3 className="mt-4 text-sm font-semibold text-text">Documents to bring</h3>
                      <ul className="mt-1 space-y-1 text-sm text-subtle">
                        {doc.result.documentsToBring.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {doc.result.warnings.length > 0 && (
                    <div className="mt-4 rounded-md border border-warning-border bg-warning-bg p-3">
                      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-warning">
                        <AlertTriangle size={14} aria-hidden="true" /> Check before acting
                      </h3>
                      <ul className="list-disc space-y-1 pl-5 text-[0.8rem] text-text">
                        {doc.result.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                {doc.result.sections.length > 0 && (
                  <section className="rounded-lg border border-border bg-surface p-4">
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                      <ListTree size={16} aria-hidden="true" /> Important sections
                    </h2>
                    <ul className="space-y-2">
                      {doc.result.sections.map((s, i) => (
                        <li key={i} className="rounded-md border border-border bg-background p-3">
                          <p className="text-sm font-medium text-text">{s.title}</p>
                          <p className="text-[0.8rem] text-subtle">{s.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="mb-2 text-sm font-semibold text-text">What you must do</h2>
                  <ol className="space-y-2">
                    {doc.result.actions.map((a) => (
                      <li key={a.id} className="rounded-md border border-border bg-background p-3 text-sm text-text">
                        {a.urgent && <span aria-hidden="true">⚠️ </span>}
                        {a.step}
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="mb-2 text-sm font-semibold text-text">Deadlines and costs</h2>
                  <ul className="space-y-2">
                    {doc.result.deadlines.map((d) => (
                      <li key={d.id} className="rounded-md border border-border bg-background p-3 text-sm">
                        <span className="font-medium text-text">{d.label}</span>{" "}
                        <span className="text-subtle">{d.originalValue}</span>
                        {d.verified && <span className="ml-1 text-success">✓ verified in the original</span>}
                        {!d.verified && <span className="ml-1 text-warning">⚠ check the original</span>}
                      </li>
                    ))}
                    {doc.result.costs.map((c) => (
                      <li key={c.id} className="rounded-md border border-border bg-background p-3 text-sm">
                        <span className="font-medium text-text">{c.label}</span>{" "}
                        <span className="text-subtle">{c.originalValue}</span>
                        {c.verified && <span className="ml-1 text-success">✓ verified in the original</span>}
                        {!c.verified && <span className="ml-1 text-warning">⚠ check the original</span>}
                      </li>
                    ))}
                    {doc.result.deadlines.length === 0 && doc.result.costs.length === 0 && (
                      <li className="text-sm text-subtle">This document states no deadline or cost.</li>
                    )}
                  </ul>
                </section>

                {doc.result.warnings.length > 0 && (
                  <section className="rounded-lg border border-warning-border bg-warning-bg p-4">
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
                      <AlertTriangle size={16} aria-hidden="true" /> Important warnings
                    </h2>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-text">
                      {doc.result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <a
                href="/assistant"
                className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-text"
              >
                <MessageSquare size={16} aria-hidden="true" /> Ask about this document
              </a>
              <a
                href="/translate"
                className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-text"
              >
                <Languages size={16} aria-hidden="true" /> Translate it
              </a>
              <a
                href="/opportunity"
                className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-text"
              >
                <Volume2 size={16} aria-hidden="true" /> Listen and check eligibility
              </a>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
