import { useState } from "react";
import { Menu, Globe, ShieldCheck, FileText, AlertTriangle, Sun, Moon } from "lucide-react";
import { LANGUAGES, languageName, isEthiopic } from "../../lib/languages.ts";
import type { LanguageCode } from "../../lib/languages.ts";
import { loadTheme, applyTheme, saveTheme } from "../../theme.ts";
import type { Theme } from "../../theme.ts";

export interface HeaderProps {
  onNavigate?: (path: string) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
  currentPath: string;
}

const NAV_LINKS = [
  { path: "/privacy", label: "Privacy", Icon: ShieldCheck },
  { path: "/eval", label: "Evaluation", Icon: FileText },
  { path: "/limitations", label: "Limitations", Icon: AlertTriangle },
];

const linkClass =
  "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-text-primary text-sm hover:bg-surface-muted transition-colors";

export function Header({ onNavigate, lang, onLangChange, currentPath }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  const cycleLanguage = () => {
    const index = LANGUAGES.findIndex((l) => l.code === lang);
    const next = LANGUAGES[(index + 1) % LANGUAGES.length];
    onLangChange(next.code);
  };

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  };

  const handleLink = (path: string) => (e: React.MouseEvent) => {
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(path);
    setMenuOpen(false);
  };

  return (
    <header className="border-b border-border bg-surface backdrop-blur sticky top-0 z-40">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-border bg-accent flex items-center justify-center text-accent-foreground text-sm font-bold">
            PW
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">PasteWise</h1>
            <p className="text-xs text-text-secondary">Document understanding</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 text-sm">
          <button
            type="button"
            className={linkClass}
            onClick={cycleLanguage}
            title="Change explanation language"
            aria-label={`Explanation language: ${languageName(lang)}. Click to change.`}
          >
            <Globe size={16} strokeWidth={2} />
            <span className={isEthiopic(lang) ? "font-ethiopic" : ""}>{languageName(lang)}</span>
          </button>
          {NAV_LINKS.map(({ path, label, Icon }) => {
            const active = currentPath === path;
            return (
              <a
                key={path}
                href={path}
                onClick={handleLink(path)}
                aria-current={active ? "page" : undefined}
                className={`${linkClass} ${
                  active
                    ? "bg-surface-muted border-accent text-text-primary font-semibold"
                    : ""
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="touch-target rounded-lg border border-border bg-background p-2 text-text-primary hover:bg-surface-muted transition-colors"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>
          <button
            type="button"
            className="md:hidden touch-target rounded-lg border border-border bg-background p-2 text-text-primary"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Globe size={20} strokeWidth={2} />
            <span className="text-sm font-semibold text-text-primary">Language</span>
          </div>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map((l) => {
              const selected = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    onLangChange(l.code);
                    setMenuOpen(false);
                  }}
                  className={`flex items-center justify-between w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-left ${
                    selected
                      ? "bg-accent text-accent-foreground border-accent"
                      : "text-text-primary hover:bg-surface-muted"
                  }`}
                >
                  <span className={isEthiopic(l.code) ? "font-ethiopic" : ""}>
                    {languageName(l.code)}
                  </span>
                  {selected && <span className="text-xs">Selected</span>}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            {NAV_LINKS.map(({ path, label, Icon }) => {
              const active = currentPath === path;
              return (
                <a
                  key={path}
                  href={path}
                  onClick={handleLink(path)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-sm ${
                    active
                      ? "border-accent bg-surface-muted text-text-primary font-semibold"
                      : "border-border bg-background text-text-primary hover:bg-surface-muted"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{label}</span>
                  {active && <span className="ml-auto text-xs text-text-secondary">Current</span>}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
