import { useState, useCallback, useEffect } from "react";
import { AppShell, type AppShellProps } from "./components/layout/AppShell.tsx";
import { Home } from "./screens/Home.tsx";
import { Understand } from "./screens/Understand.tsx";
import { Actions } from "./screens/Actions.tsx";
import { HybridLab } from "./screens/HybridLab.tsx";
import { PrivacyCenter } from "./screens/PrivacyCenter.tsx";
import { Eval } from "./screens/Eval.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Auth } from "./screens/Auth.tsx";
import { refreshAuth } from "./lib/auth.ts";
import { loadLastLanguage, saveLastLanguage } from "./lib/languages.ts";
import type { LanguageCode } from "./lib/languages.ts";
import { listDocs, saveDoc } from "./lib/library.ts";
import type { LibraryDoc, OriginalFile } from "./lib/library.ts";
import type { ExplanationResult } from "./lib/api/types.ts";
import { getDeviceModelAvailability } from "./lib/hybrid/index.ts";
import { loadPrivacyMode, savePrivacyMode } from "./lib/privacy/storage.ts";
import type { CapabilityState, PrivacyMode } from "./lib/privacy/modes.ts";

type Page =
  | "home"
  | "understand"
  | "actions"
  | "hybrid-lab"
  | "privacy-center"
  | "evaluation"
  | "settings"
  | "auth";

const PATH_BY_PAGE: Record<Page, string> = {
  home: "/",
  understand: "/understand",
  actions: "/actions",
  "hybrid-lab": "/hybrid-lab",
  "privacy-center": "/privacy-center",
  evaluation: "/evaluation",
  settings: "/settings",
  auth: "/auth",
};

/**
 * Legacy routes from the previous workspace navigation. They redirect to the
 * nearest contextual tool instead of silently landing on a blank or dead page.
 */
const LEGACY_REDIRECTS: Record<string, Page> = {
  "/result": "understand",
  "/reader": "understand",
  "/translate": "understand",
  "/simplify": "understand",
  "/voice": "understand",
  "/assistant": "understand",
  "/compare": "understand",
  "/upload": "home",
  "/library": "home",
  "/history": "home",
  "/dashboard": "home",
  "/privacy": "privacy-center",
  "/limitations": "privacy-center",
  "/eval": "evaluation",
  "/opportunity": "actions",
};

function normalise(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

function pageFromPath(pathname: string): Page {
  const clean = normalise(pathname);
  const legacy = LEGACY_REDIRECTS[clean];
  if (legacy) return legacy;
  const match = (Object.keys(PATH_BY_PAGE) as Page[]).find((p) => PATH_BY_PAGE[p] === clean);
  return match ?? "home";
}

function canonicalPath(pathname: string): string {
  const clean = normalise(pathname);
  const page = pageFromPath(clean);
  return PATH_BY_PAGE[page];
}

const DEFAULT_UPDATE_NOTICE =
  "Private by default. Hybrid AI (on-device Gemini Nano when available, cloud via Firebase AI Logic otherwise).";

export function App() {
  const [path, setPath] = useState<string>(() =>
    typeof window !== "undefined" ? canonicalPath(window.location.pathname) : "/"
  );
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  const [activeDoc, setActiveDoc] = useState<LibraryDoc | null>(null);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(() => loadPrivacyMode());
  const [capability, setCapability] = useState<CapabilityState>("checking");
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const page = pageFromPath(path);

  const navigate = useCallback((next: string) => {
    const target = canonicalPath(next);
    if (window.location.pathname !== target) {
      window.history.pushState(null, "", target);
    }
    setPath(target);
  }, []);

  const handleLangChange = useCallback((code: LanguageCode) => {
    saveLastLanguage(code);
    setLang(code);
  }, []);

  const handlePrivacyModeChange = useCallback((mode: PrivacyMode) => {
    savePrivacyMode(mode);
    setPrivacyMode(mode);
  }, []);

  const handleResult = useCallback(
    (data: ExplanationResult, originalFile?: OriginalFile | null) => {
      setResult(data);
      try {
        const doc = saveDoc({
          sourceText: data.originalText ?? "",
          fullText: data.originalText ?? "",
          result: data,
          originalFile: originalFile ?? null,
        });
        setActiveDoc(doc);
      } catch {
        // Storage is optional; the in-memory result still drives this session.
      }
      navigate("/understand");
    },
    [navigate]
  );

  const handleResultUpdate = useCallback((data: ExplanationResult) => {
    setResult(data);
    try {
      const doc = saveDoc({
        sourceText: data.originalText ?? "",
        fullText: data.originalText ?? "",
        result: data,
      });
      setActiveDoc(doc);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, []);

  // Normalise a legacy deep link in place, without a full page reload.
  useEffect(() => {
    const target = canonicalPath(window.location.pathname);
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
      setPath(target);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(canonicalPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.documentElement.dir = "ltr";
  }, []);

  // Pick up the most recent saved document so the workspace is never empty.
  useEffect(() => {
    setActiveDoc((current) => current ?? listDocs()[0] ?? null);
  }, []);

  // Real capability probe, refreshed whenever the route changes.
  useEffect(() => {
    let cancelled = false;
    setCapability("checking");
    (async () => {
      try {
        const availability = await getDeviceModelAvailability();
        if (!cancelled) setCapability(availability === "available" ? "ready" : "unavailable");
      } catch {
        if (!cancelled) setCapability("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const activeResult: ExplanationResult | null = result ?? activeDoc?.result ?? null;

  const shellProps: AppShellProps = {
    children: null as never, // children passed via JSX below
    capability,
    online,
    privacyMode,
    lastSource: (activeResult?.inferenceSource === "ON_DEVICE"
      ? "on-device"
      : activeResult?.inferenceSource === "IN_CLOUD"
        ? "cloud"
        : "not-run") as "on-device" | "cloud" | "not-run",
    currentPath: path,
    onNavigate: navigate,
    updateNotice: DEFAULT_UPDATE_NOTICE,
  };

  return (
    <AppShell {...shellProps}>
      {page === "home" && (
        <Home
          lang={lang}
          onLangChange={handleLangChange}
          privacyMode={privacyMode}
          onPrivacyModeChange={handlePrivacyModeChange}
          onResult={handleResult}
        />
      )}
      {page === "understand" && (
        <Understand
          result={activeResult}
          lang={lang}
          privacyMode={privacyMode}
          capability={capability}
          online={online}
          onLangChange={handleLangChange}
          onResultUpdate={handleResultUpdate}
          onGoToHome={() => navigate("/")}
          onGoToActions={() => navigate("/actions")}
          onGoToHybridLab={() => navigate("/hybrid-lab")}
        />
      )}
      {page === "actions" && (
        <Actions
          result={activeResult}
          activeDoc={activeDoc}
          lang={lang}
          onBack={() => navigate("/understand")}
          onGoHome={() => navigate("/")}
          onLangChange={handleLangChange}
        />
      )}
      {page === "hybrid-lab" && <HybridLab result={activeResult} onBack={() => navigate("/")} />}
      {page === "privacy-center" && <PrivacyCenter onBack={() => navigate("/")} />}
      {page === "evaluation" && <Eval onBack={() => navigate("/")} />}
      {page === "settings" && <Settings onNavigate={navigate} />}
      {page === "auth" && (
        <Auth onBack={() => navigate("/settings")} onSignedIn={() => navigate("/settings")} />
      )}
    </AppShell>
  );
}
