import { useState, useCallback, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell.tsx";
import { Home } from "./screens/Home.tsx";
import { Result } from "./screens/Result.tsx";
import { Eval } from "./screens/Eval.tsx";
import { Privacy } from "./screens/Privacy.tsx";
import { Limitations } from "./screens/Limitations.tsx";
import { loadLastLanguage, saveLastLanguage } from "./lib/languages.ts";
import type { LanguageCode } from "./lib/languages.ts";
import { resolveDemo } from "./lib/demo.ts";

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
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());

  const handleLangChange = useCallback((code: LanguageCode) => {
    saveLastLanguage(code);
    setLang(code);
  }, []);

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const navigate = useCallback((next: Page) => {
    const path = PATH_BY_PAGE[next];
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setPage(next);
  }, []);

  const activePage: Page = page === "result" && !result ? "home" : page;

  return (
    <AppShell>
      {activePage === "home" && (
        <Home
          lang={lang}
          onLangChange={handleLangChange}
          onResult={(data: any) => {
            setResult(data);
            navigate("result");
          }}
        />
      )}
      {activePage === "result" && result && (
        <Result
          result={result}
          onBack={() => {
            setResult(null);
            navigate("home");
          }}
          onLangChange={(code) => {
            const nextLang = code as LanguageCode;
            handleLangChange(nextLang);
            if (result.demoId) {
              const next = resolveDemo(result.demoId, nextLang);
              if (next) setResult(next);
            }
          }}
        />
      )}
      {activePage === "eval" && <Eval onBack={() => navigate("home")} />}
      {activePage === "privacy" && <Privacy onBack={() => navigate("home")} />}
      {activePage === "limitations" && (
        <Limitations onBack={() => navigate("home")} />
      )}
    </AppShell>
  );
}
