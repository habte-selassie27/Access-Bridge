import { useState, useCallback, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell.tsx";
import { Home } from "./screens/Home.tsx";
import { Result } from "./screens/Result.tsx";
import { Eval } from "./screens/Eval.tsx";
import { Privacy } from "./screens/Privacy.tsx";
import { Limitations } from "./screens/Limitations.tsx";
import { loadLastLanguage, saveLastLanguage } from "./lib/languages.ts";
import type { LanguageCode } from "./lib/languages.ts";
import { explainDocument } from "./lib/api/explain.ts";

type ExplainInput = { text?: string; file?: File; lang: string; demoId?: string };

type Page = "home" | "result" | "eval" | "privacy" | "limitations";

const PATH_BY_PAGE: Record<Page, string> = {
  home: "/",
  result: "/result",
  eval: "/eval",
  privacy: "/privacy",
  limitations: "/limitations",
};

function pageFromPath(pathname: string): Page {
  const clean = pathname.replace(/\/+$/, "");
  if (clean === "/eval") return "eval";
  if (clean === "/result") return "result";
  if (clean === "/privacy") return "privacy";
  if (clean === "/limitations") return "limitations";
  return "home";
}

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [result, setResult] = useState<any>(null);
  const [lastInput, setLastInput] = useState<ExplainInput | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());

  const handleLangChange = useCallback((code: LanguageCode) => {
    saveLastLanguage(code);
    setLang(code);
  }, []);

  // Re-run the same document in the newly chosen language. Demo examples resolve
  // locally, so this is instant and works offline; live documents go back to the API.
  const handleResultLangChange = useCallback(
    async (code: LanguageCode) => {
      if (!lastInput) return;
      saveLastLanguage(code);
      setLang(code);
      setSwitchError(null);
      setSwitching(true);
      const next = { ...lastInput, lang: code };
      try {
        const { data, error } = await explainDocument(next);
        if (error || !data) {
          setSwitchError(error?.message || "Could not switch language.");
          return;
        }
        setResult(data);
        setLastInput(next);
      } catch {
        setSwitchError("Could not switch language right now.");
      } finally {
        setSwitching(false);
      }
    },
    [lastInput]
  );

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next: Page) => {
    const path = PATH_BY_PAGE[next];
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setPage(next);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(pageFromPath(path));
    },
    [navigate]
  );

  // A reload on /result has no document data to show, so fall back to the paste box.
  const activePage: Page = page === "result" && !result ? "home" : page;

  return (
    <AppShell
      onNavigate={handleNavigate}
      lang={lang}
      onLangChange={handleLangChange}
      currentPath={PATH_BY_PAGE[activePage]}
    >
      {activePage === "home" && (
        <Home
          lang={lang}
          onLangChange={handleLangChange}
          onResult={(data: any, input: ExplainInput) => {
            setResult(data);
            setLastInput(input);
            setSwitchError(null);
            navigate("result");
          }}
        />
      )}
      {activePage === "result" && result && (
        <Result
          result={result}
          onBack={() => {
            setResult(null);
            setLastInput(null);
            setSwitchError(null);
            navigate("home");
          }}
          onLangChange={handleResultLangChange}
          switching={switching}
          switchError={switchError}
        />
      )}
      {activePage === "eval" && <Eval onBack={() => navigate("home")} />}
      {activePage === "privacy" && <Privacy onBack={() => navigate("home")} />}
      {activePage === "limitations" && <Limitations onBack={() => navigate("home")} />}
    </AppShell>
  );
}
