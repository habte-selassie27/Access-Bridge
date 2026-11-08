export interface PrivacyProps {
  onBack: () => void;
}

const SECTIONS = [
  {
    title: "We do not store your documents",
    body: "Documents are processed in memory to produce an explanation and are not saved to a database. PasteWise has no accounts and no history, so your document is not attached to you.",
  },
  {
    title: "Live processing uses an external AI service",
    body: "When live processing is enabled, the text of your document is sent to the configured AI provider so it can generate the explanation. That provider processes the content under its own terms. If you would not share a document with a third party, use the demo examples instead.",
  },
  {
    title: "What we log",
    body: "Only metadata, such as document length, selected language and processing time. We do not log document content.",
  },
  {
    title: "Demo examples work offline",
    body: "The three example documents are bundled with the app. They load instantly, need no network connection, and require no API key, so you can try PasteWise without sending anything anywhere.",
  },
];

export function Privacy({ onBack }: PrivacyProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Privacy</h1>
          <p className="text-sm text-text-secondary">
            What happens to a document after you paste it.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-semibold text-text-primary mb-2">{section.title}</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">
        PasteWise explains documents in plain language. It is not legal, medical or financial advice.
        Always check important information against the original document.
      </p>
    </section>
  );
}
