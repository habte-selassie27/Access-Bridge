export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface py-8">
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 text-sm text-subtle md:flex-row md:items-center">
          <a href="/" className="flex items-center gap-3" aria-label="AccessBridge home">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-border bg-neutral-bold text-[0.75rem] font-bold text-inverse">
              AB
            </span>
            <span className="font-semibold text-text">AccessBridge</span>
          </a>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
            <a href="/privacy" className="transition-colors hover:text-text">
              Privacy
            </a>
            <a href="/eval" className="transition-colors hover:text-text">
              Evaluation
            </a>
            <a href="/limitations" className="transition-colors hover:text-text">
              Limitations
            </a>
          </nav>
        </div>
        <p className="mt-6 text-[0.75rem] leading-relaxed text-subtlest">
          AccessBridge explains documents in plain language. It is not legal, medical or financial
          advice. Always check important information against the original document.
        </p>
      </div>
    </footer>
  );
}
