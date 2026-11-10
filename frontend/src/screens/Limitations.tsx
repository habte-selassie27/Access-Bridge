import { ArrowLeft } from "lucide-react";

export interface LimitationsProps {
  onBack: () => void;
}

const LIMITATIONS = [
  {
    title: "Not legal, medical or financial advice",
    body: "AccessBridge explains what a document says. It does not tell you what to do about it. For decisions with consequences, confirm with the issuing authority or a qualified professional.",
  },
  {
    title: "Language quality varies",
    body: "Amharic, Oromo and Tigrinya are lower-resource languages, so explanations can be less precise than the English version. The evaluation page shows measured gaps rather than only the best cases.",
  },
  {
    title: "Photo and PDF reading is imperfect",
    body: "OCR struggles with handwriting, skewed pages and bad lighting. Pasting text is the most reliable path. Anything read from an image should be checked against the paper original.",
  },
  {
    title: "Numbers are checked against the source, or not shown",
    body: "Dates, deadlines and amounts are verified by deterministic code against your document text. If a value cannot be traced back to the source, it is not presented as verified.",
  },
  {
    title: "Live mode needs an API key",
    body: "The demo examples run fully offline with no key. Explaining your own document with live processing requires a configured API key, and depends on the AI provider staying available.",
  },
];

export function Limitations({ onBack }: LimitationsProps) {
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
        <h1 className="text-2xl font-bold text-text">Limitations</h1>
        <p className="text-sm text-subtle">What AccessBridge does well, and where it can be wrong.</p>
      </div>

      <div className="space-y-3">
        {LIMITATIONS.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-1.5">{item.title}</h2>
            <p className="text-sm text-subtle leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
