const DEMOS = [
  {
    id: "demo-1",
    title: "Government Notice",
    description: "Health insurance renewal notice with deadline and fee.",
    docType: "Government notice",
  },
  {
    id: "demo-2",
    title: "Medical Document",
    description: "Medical appointment notice with date and documents to bring.",
    docType: "Medical document",
  },
  {
    id: "demo-3",
    title: "Financial Document",
    description: "School fee notice with amount and payment deadline.",
    docType: "Financial document",
  },
] as const;

export interface DemoPickerProps {
  onSelect: (demoId: string) => void;
}

export function DemoPicker({ onSelect }: DemoPickerProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-full border border-accent bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
          !
        </span>
        <h3 className="text-sm font-semibold text-text-primary">Try an example</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEMOS.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => onSelect(demo.id)}
            className="touch-target flex flex-col items-start gap-2 rounded-lg border border-border bg-background p-3 text-left text-sm hover:bg-surface-muted hover:border-accent transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-primary">{demo.docType}</span>
            </div>
            <h4 className="text-sm font-semibold text-text-primary">{demo.title}</h4>
            <p className="text-xs text-text-secondary line-clamp-2">{demo.description}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-secondary text-center">
        Examples load instantly — no network required.
      </p>
    </section>
  );
}
