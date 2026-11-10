import { useState, useCallback, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell.tsx";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout.tsx";
import { Home } from "./screens/Home.tsx";
import { Result } from "./screens/Result.tsx";
import { Upload } from "./screens/Upload.tsx";
import { Eval } from "./screens/Eval.tsx";
import { Privacy } from "./screens/Privacy.tsx";
import { Limitations } from "./screens/Limitations.tsx";
import { Dashboard } from "./screens/Dashboard.tsx";
import { Assistant } from "./screens/Assistant.tsx";
import { Library } from "./screens/Library.tsx";
import { Reader } from "./screens/Reader.tsx";
import { Translate } from "./screens/Translate.tsx";
import { Simplify } from "./screens/Simplify.tsx";
import { Voice } from "./screens/Voice.tsx";
import { Actions } from "./screens/Actions.tsx";
import { Opportunity } from "./screens/Opportunity.tsx";
import { Compare } from "./screens/Compare.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Auth } from "./screens/Auth.tsx";
import { History } from "./screens/History.tsx";
import { refreshAuth, useAuth } from "./lib/auth.ts";
import { loadLastLanguage, saveLastLanguage } from "./lib/languages.ts";
import type { LanguageCode } from "./lib/languages.ts";
import { resolveDemo } from "./lib/demo.ts";
import { explainDocument } from "./lib/api/explain.ts";
import { listDocs, saveDoc } from "./lib/library.ts";
import type { LibraryDoc } from "./lib/library.ts";

type Page =
  | "home"
  | "result"
  | "upload"
  | "eval"
  | "privacy"
  | "limitations"
  | "dashboard"
  | "assistant"
  | "library"
  | "reader"
  | "translate"
  | "simplify"
  | "voice"
  | "actions"
  | "opportunity"
  | "compare"
  | "settings"
  | "auth"
  | "history";

const PATH_BY_PAGE: Record<Page, string> = {
  home: "/",
  result: "/result",
  upload: "/upload",
  eval: "/eval",
  privacy: "/privacy",
  limitations: "/limitations",
  dashboard: "/dashboard",
  assistant: "/assistant",
  library: "/library",
  reader: "/reader",
  translate: "/translate",
  simplify: "/simplify",
  voice: "/voice",
  actions: "/actions",
  opportunity: "/opportunity",
  compare: "/compare",
  settings: "/settings",
  auth: "/auth",
  history: "/history",
};

/** Pages that use the workspace layout (sidebar) instead of the simple shell. */
const WORKSPACE_PAGES: Page[] = [
  "dashboard",
  "assistant",
  "library",
  "reader",
  "translate",
  "simplify",
  "voice",
  "actions",
  "opportunity",
  "compare",
  "settings",
  "auth",
  "history",
  "upload",
  "eval",
  "privacy",
  "limitations",
];

function pageFromPath(pathname: string): Page {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const match = (Object.keys(PATH_BY_PAGE) as Page[]).find((p) => PATH_BY_PAGE[p] === clean);
  return match ?? "home";
}

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [result, setResult] = useState<any>(null);
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  /** The signed-in profile, or null for guest mode. */
  const profile = useAuth();
  /** The document currently open in the workspace screens. */
  const [activeDoc, setActiveDoc] = useState<LibraryDoc | null>(null);
  /** Set when a language cannot be served for the current document. */
  const [langNotice, setLangNotice] = useState<string | null>(null);

  const handleLangChange = useCallback((code: LanguageCode) => {
    saveLastLanguage(code);
    setLang(code);
  }, []);

  // The cached profile paints immediately; this reconciles it with the
  // server session (for example after signing in on another tab).
  useEffect(() => {
    void refreshAuth();
  }, []);

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // The interface itself is English and always left-to-right. The document
  // language is announced on the content regions that carry it (see
  // lib/direction.ts) — flipping <html dir> would mirror the whole chrome.
  useEffect(() => {
    document.documentElement.dir = "ltr";
  }, []);

  const navigate = useCallback((next: Page) => {
    const path = PATH_BY_PAGE[next];
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setPage(next);
  }, []);

  /** Open a saved document in the workspace and make it the active one. */
  const openDoc = useCallback(
    (doc: LibraryDoc) => {
      setActiveDoc(doc);
    },
    []
  );

  /**
   * Re-read the current document in another language.
   *
   * The source text is explained again from scratch, so the dates and amounts
   * are verified against the original a second time rather than being carried
   * over from the previous answer.
   */
  const reExplainIn = useCallback(
    async (lang: LanguageCode) => {
      const sourceText = result?.originalText;
      if (!sourceText) return;
      setLangNotice(null);
      const { data, error } = await explainDocument({ text: sourceText, lang });
      if (error || !data) {
        setLangNotice(error?.message || "We could not read this document in that language right now.");
        return;
      }
      setResult(data);
      try {
        setActiveDoc(saveDoc({ sourceText, result: data, originalFile: activeDoc?.originalFile ?? null }));
      } catch {
        // ignore storage failures
      }
    },
    [result, activeDoc]
  );

  // On a fresh visit, pick up the most recent document so the workspace is
  // never an empty shell.
  useEffect(() => {
    setActiveDoc((current) => current ?? listDocs()[0] ?? null);
  }, []);

  const activePage: Page = page === "result" && !result ? "home" : page;

  if (WORKSPACE_PAGES.includes(activePage)) {
    // The whole workspace is keyed by the profile: signing in or out remounts
    // it, so every screen re-reads the library for the new scope.
    return (
      <div key={profile?.id ?? "guest"}>
        {activePage === "dashboard" && (
          <Dashboard onOpenDoc={(doc) => { openDoc(doc); navigate("reader"); }} />
        )}
        {activePage === "assistant" && <Assistant lang={lang} activeDoc={activeDoc} />}
        {activePage === "library" && (
          <Library onOpenDoc={(doc) => { openDoc(doc); navigate("reader"); }} />
        )}
        {activePage === "reader" && <Reader activeDoc={activeDoc} onOpenDoc={openDoc} />}
        {activePage === "translate" && <Translate lang={lang} activeDoc={activeDoc} />}
        {activePage === "simplify" && <Simplify lang={lang} activeDoc={activeDoc} />}
        {activePage === "voice" && <Voice lang={lang} activeDoc={activeDoc} />}
        {activePage === "actions" && <Actions activeDoc={activeDoc} />}
        {activePage === "opportunity" && <Opportunity lang={lang} activeDoc={activeDoc} />}
        {activePage === "compare" && <Compare lang={lang} />}
        {activePage === "history" && <History />}
        {activePage === "settings" && <Settings onSignedIn={() => navigate("dashboard")} />}
        {activePage === "auth" && (
          <Auth onBack={() => navigate("dashboard")} onSignedIn={() => navigate("dashboard")} />
        )}
        {activePage === "upload" && (
          <WorkspaceLayout
            currentPath="/upload"
            title="Upload wizard"
            subtitle="Step by step: upload, explain, verify, listen, ask, evaluate."
            showHeading={false}
          >
            <Upload onBack={() => navigate("dashboard")} onDocRead={(doc) => setActiveDoc(doc)} />
          </WorkspaceLayout>
        )}
        {activePage === "eval" && (
          <WorkspaceLayout
            currentPath="/eval"
            title="Evaluation"
            subtitle="Baseline vs adapted results across languages."
            showHeading={false}
          >
            <Eval onBack={() => navigate("dashboard")} />
          </WorkspaceLayout>
        )}
        {activePage === "privacy" && (
          <WorkspaceLayout
            currentPath="/privacy"
            title="Privacy"
            subtitle="What we store, and what we do not."
            showHeading={false}
          >
            <Privacy onBack={() => navigate("dashboard")} />
          </WorkspaceLayout>
        )}
        {activePage === "limitations" && (
          <WorkspaceLayout
            currentPath="/limitations"
            title="Limitations"
            subtitle="Where AccessBridge falls short."
            showHeading={false}
          >
            <Limitations onBack={() => navigate("dashboard")} />
          </WorkspaceLayout>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      {activePage === "home" && (
        <Home
          lang={lang}
          onLangChange={handleLangChange}
          onResult={(data: any, originalFile) => {
            setResult(data);
            // The explanation carries its own `lang` on the content regions
            // (see lib/direction.ts); the interface stays in English.
            // Reading a document saves it to the personal library so the
            // workspace screens have something to work with.
            try {
              const doc = saveDoc({ sourceText: data.originalText ?? "", fullText: data.originalText ?? "", result: data, originalFile });
              setActiveDoc(doc);
            } catch {
              // The library is a convenience; a storage failure must not
              // break the result screen.
            }
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
              if (next) {
                setResult(next);
                setLangNotice(null);
              } else {
                // The saved example has no output in this language. Showing the
                // old text under a new language label would be a mistranslation.
                setLangNotice(
                  "This saved example is only available in English, Amharic, Oromo and Tigrinya. Read a new document for other languages."
                );
              }
              return;
            }
            // A live result is re-read from its own source text in the new
            // language, and every date and amount is verified again.
            void reExplainIn(nextLang);
          }}
          notice={langNotice}
        />
      )}
    </AppShell>
  );
}

/** Kept for the header: the most recently opened document, if any. */
export function currentLibraryDoc(): LibraryDoc | null {
  const docs = listDocs();
  return docs[0] ?? null;
}
