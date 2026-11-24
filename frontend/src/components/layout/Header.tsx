import { useEffect, useState } from "react";
import {
  Home,
  BookOpen,
  ListChecks,
  Cpu,
  ShieldCheck,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import type { CapabilityState, PrivacyMode } from "../../lib/privacy/modes.ts";
import { PRIVACY_LABELS } from "../../lib/privacy/modes.ts";
import { useA11y, setA11y } from "../../lib/a11y.ts";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

/** The six primary destinations from UI.md §1.3, in order. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Understand", href: "/understand", icon: BookOpen },
  { label: "Take Action", href: "/actions", icon: ListChecks },
  { label: "Hybrid AI Lab", href: "/hybrid-lab", icon: Cpu },
  { label: "Privacy Center", href: "/privacy-center", icon: ShieldCheck },
  { label: "AI Evaluation", href: "/evaluation", icon: BarChart3 },
];

export interface HeaderProps {
  capability?: CapabilityState;
  online?: boolean;
  privacyMode?: PrivacyMode;
  /** Current route path, used for the active state. */
  currentPath?: string;
  /** Client-side navigation; falls back to a normal link when absent. */
  onNavigate?: (path: string) => void;
}

function isActive(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function Header({
  capability = "checking",
  online = true,
  privacyMode = "smart",
  currentPath,
  onNavigate,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useA11y();
  const path = currentPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  };

  const capabilityText =
    capability === "ready"
      ? "Device AI ready"
      : capability === "checking"
        ? "Checking device AI"
        : capability === "error"
          ? "Device AI check failed"
          : "Device AI unavailable";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="/"
          onClick={(event) => go(event, "/")}
          className="flex min-w-0 shrink items-center gap-2.5"
          aria-label="AccessBridge Hybrid home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[0.75rem] font-bold text-inverse">
            AB
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-text">AccessBridge Hybrid</span>
            <span className="hidden truncate text-[0.75rem] text-subtle sm:block">
              Understand it. Verify it. Act on it.
            </span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden shrink-0 items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, path);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => go(event, item.href)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-inverse"
                    : "text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
          <a
            href="/settings"
            onClick={(event) => go(event, "/settings")}
            className={`inline-flex items-center gap-1.5 rounded-md p-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text ${
              isActive("/settings", path) ? "bg-brand/10 text-text" : ""
            }`}
            aria-label="Settings"
            aria-current={isActive("/settings", path) ? "page" : undefined}
          >
            <Settings size={18} strokeWidth={2} aria-hidden="true" />
          </a>
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={() => setA11y({ theme: theme === "dark" ? "light" : "dark" })}
            className="inline-flex items-center justify-center rounded-md p-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={2} aria-hidden="true" /> : <Moon size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
        </nav>

        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          <a
            href="/settings"
            onClick={(event) => go(event, "/settings")}
            className="inline-flex items-center justify-center rounded-md p-2 text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label="Settings"
          >
            <Settings size={18} strokeWidth={2} aria-hidden="true" />
          </a>
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={() => setA11y({ theme: theme === "dark" ? "light" : "dark" })}
            className="inline-flex items-center justify-center rounded-md p-2 text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={2} aria-hidden="true" /> : <Moon size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} strokeWidth={2} aria-hidden="true" /> : <Menu size={20} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-border bg-surface px-4 pb-4 pt-2 lg:hidden"
        >
          <ul className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, path);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={(event) => go(event, item.href)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                      active ? "bg-brand text-inverse" : "text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.75rem] text-subtle">
            <div>
              <dt className="inline">Device AI: </dt>
              <dd className="inline text-text">{capabilityText}</dd>
            </div>
            <div>
              <dt className="inline">Network: </dt>
              <dd className="inline text-text">{online ? "online" : "offline"}</dd>
            </div>
            <div>
              <dt className="inline">Mode: </dt>
              <dd className="inline text-text">{PRIVACY_LABELS[privacyMode]}</dd>
            </div>
          </dl>
        </nav>
      )}
    </header>
  );
}
