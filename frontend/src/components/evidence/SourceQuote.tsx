export interface SourceQuoteProps {
  quote: string;
  span: [number, number];
}

export function SourceQuote({ quote, span }: SourceQuoteProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 font-mono text-[0.75rem] text-text">
      <span className="rounded border-l-2 border-warning-border bg-warning-bg pl-2 pr-1">
        “{quote}”
      </span>
      <span className="ml-2 text-[0.75rem] text-subtle">
        [{span[0]}–{span[1]}]
      </span>
    </div>
  );
}
