export interface SourceQuoteProps {
  quote: string;
  span: [number, number];
}

export function SourceQuote({ quote, span }: SourceQuoteProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-text-primary">
      <span className="bg-yellow-50/50 px-1 rounded border-l-2 border-yellow-400 pl-1">
        “{quote}”
      </span>
      <span className="ml-2 text-xs text-text-secondary">
        [{span[0]}–{span[1]}]
      </span>
    </div>
  );
}
