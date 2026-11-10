import { ArrowLeft } from "lucide-react";

export interface PrivacyProps {
  onBack: () => void;
}

const SECTIONS = [
  {
    title: "We do not store your documents",
    body: "Documents are processed in memory to produce an explanation and are not saved to a database. AccessBridge has no accounts and no history, so your document is not attached to you.",
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
    body: "The three example documents are bundled with the app. They load instantly, need no network connection, and require no API key, so you can try AccessBridge without sending anything anywhere.",
  },
];

export function Privacy({ onBack }: PrivacyProps) {
  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text transition-colors hover:bg-neutral-subtle-hovered"
      >
        <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-text">Privacy</h1>
        <p className="text-sm text-subtle">What happens to a document after you paste it.</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-1.5">{section.title}</h2>
            <p className="text-sm text-subtle leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
