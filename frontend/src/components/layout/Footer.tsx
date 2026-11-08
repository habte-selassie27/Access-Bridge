export interface FooterProps {
  onNavigate?: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-border bg-surface py-8 mt-12">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-sm text-text-secondary">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded border border-border bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold">
              PW
            </div>
            <span className="font-semibold text-text-primary">PasteWise</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              onClick={(e) => {
                if (!onNavigate) return;
                e.preventDefault();
                onNavigate("/privacy");
              }}
              className="hover:text-text-primary transition-colors"
            >
              Privacy
            </a>
            <a
              href="/eval"
              onClick={(e) => {
                if (!onNavigate) return;
                e.preventDefault();
                onNavigate("/eval");
              }}
              className="hover:text-text-primary transition-colors"
            >
              Evaluation
            </a>
            <a
              href="/limitations"
              onClick={(e) => {
                if (!onNavigate) return;
                e.preventDefault();
                onNavigate("/limitations");
              }}
              className="hover:text-text-primary transition-colors"
            >
              Limitations
            </a>
          </div>
        </div>
        <p className="mt-6 text-xs text-text-secondary">
          PasteWise explains documents in plain language. It is not legal, medical or financial advice.
          Always check important information against the original document.
        </p>
      </div>
    </footer>
  );
}
