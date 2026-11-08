import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";

import type { LanguageCode } from "../../lib/languages.ts";

export interface AppShellProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
  lang: LanguageCode;
  onLangChange: (code: LanguageCode) => void;
  currentPath: string;
}

export function AppShell({
  children,
  onNavigate,
  lang,
  onLangChange,
  currentPath,
}: AppShellProps) {
  return (
    <div className="flex flex-col min-h-svh">
      <Header
        onNavigate={onNavigate}
        lang={lang}
        onLangChange={onLangChange}
        currentPath={currentPath}
      />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 py-6">
        {children}
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
