import type { ReactNode } from "react";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { GlobalStatusStrip } from "../common/GlobalStatusStrip.tsx";
import { UpdateApp } from "../common/UpdateApp.tsx";
import type { CapabilityState, PrivacyMode } from "../../lib/privacy/modes.ts";

export interface AppShellProps {
  children: ReactNode;
  capability?: CapabilityState;
  online?: boolean;
  privacyMode?: PrivacyMode;
  lastSource?: "on-device" | "cloud" | "not-run" | null;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  updateNotice?: string | null;
}

export function AppShell({
  children,
  capability = "checking",
  online = true,
  privacyMode = "smart",
  lastSource = null,
  currentPath,
  onNavigate,
  updateNotice,
}: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header
        capability={capability}
        online={online}
        privacyMode={privacyMode}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
      >
        <GlobalStatusStrip
          capability={capability}
          online={online}
          privacyMode={privacyMode}
          lastSource={lastSource}
        />
        <UpdateApp message={updateNotice ?? ""} />
        {children}
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
