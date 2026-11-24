export interface FooterProps {
  onNavigate?: (path: string) => void;
}

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Understand", href: "/understand" },
  { label: "Take Action", href: "/actions" },
  { label: "Privacy Center", href: "/privacy-center" },
  { label: "AI Evaluation", href: "/evaluation" },
  { label: "Hybrid AI Lab", href: "/hybrid-lab" },
  { label: "Settings", href: "/settings" },
];

export function Footer({ onNavigate }: FooterProps) {
  const go = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <footer className="mt-12 border-t border-border bg-surface py-8">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 text-sm text-subtle md:flex-row md:items-center">
          <a
            href="/"
            onClick={(event) => go(event, "/")}
            className="flex items-center gap-3"
            aria-label="AccessBridge Hybrid home"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded border border-border bg-neutral-bold text-[0.75rem] font-bold text-inverse">
              AB
            </span>
            <span className="font-semibold text-text">AccessBridge Hybrid</span>
          </a>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => go(event, link.href)}
                className="transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-6 text-[0.75rem] leading-relaxed text-subtlest">
          AccessBridge explains documents in plain language. It is not legal, medical or financial advice.
          Always check important information against the original document.
        </p>
      </div>
    </footer>
  );
}
