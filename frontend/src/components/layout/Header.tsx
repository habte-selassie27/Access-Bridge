import { FileText, ShieldCheck, LayoutDashboard, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[800px] items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <a href="/" className="flex min-w-0 shrink items-center gap-2.5" aria-label="AccessBridge home">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-bold text-[0.75rem] font-bold text-inverse">
            AB
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-text">AccessBridge</span>
            <span className="hidden truncate text-[0.75rem] text-subtle lg:block">
              One question. Any language.
            </span>
          </span>
        </a>

        <nav aria-label="Main" className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
            aria-label="Dashboard"
          >
            <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <a
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
            aria-label="Upload"
          >
            <FileText size={16} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Upload</span>
          </a>
          <a
            href="/eval"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
            aria-label="Evaluation"
          >
            <FileText size={16} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Evaluation</span>
          </a>
          <a
            href="/privacy"
            aria-label="Privacy"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
          >
            <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Privacy</span>
          </a>
          <a
            href="/limitations"
            aria-label="Limitations"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
          >
            <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Limitations</span>
          </a>
          <a
            href="/settings"
            aria-label="Settings"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text sm:px-2.5"
          >
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Settings</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
