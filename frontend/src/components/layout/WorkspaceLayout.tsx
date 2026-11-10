import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Languages,
  BookOpen,
  Volume2,
  ListChecks,
  Target,
  Settings,
  Upload,
  BarChart3,
  Menu,
  X,
  Home,
  ShieldCheck,
  ShieldAlert,
  User,
  History as HistoryIcon,
} from "lucide-react";
import { useAuth } from "../../lib/auth.ts";

export interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  hint: string;
}

export const WORKSPACE_NAV: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Everything at a glance" },
  { path: "/assistant", label: "Assistant", icon: MessageSquare, hint: "Ask about a document" },
  { path: "/library", label: "Documents", icon: FolderOpen, hint: "Your saved documents" },
  { path: "/history", label: "History", icon: HistoryIcon, hint: "Saved conversations" },
  { path: "/translate", label: "Translate", icon: Languages, hint: "Side by side" },
  { path: "/simplify", label: "Simplify", icon: BookOpen, hint: "Plain language" },
  { path: "/voice", label: "Voice", icon: Volume2, hint: "Listen and read out" },
  { path: "/actions", label: "Actions", icon: ListChecks, hint: "Checklists and deadlines" },
  { path: "/opportunity", label: "Opportunity", icon: Target, hint: "Am I eligible?" },
];

export const WORKSPACE_NAV_SECONDARY: NavItem[] = [
  { path: "/upload", label: "Upload wizard", icon: Upload, hint: "Step by step" },
  { path: "/eval", label: "Evaluation", icon: BarChart3, hint: "Measured quality" },
  { path: "/settings", label: "Settings", icon: Settings, hint: "Language and accessibility" },
  { path: "/privacy", label: "Privacy", icon: ShieldCheck, hint: "What we store" },
  { path: "/limitations", label: "Limitations", icon: ShieldAlert, hint: "Where it falls short" },
];

export interface SidebarProps {
  currentPath: string;
}

function navClass(active: boolean): string {
  return `touch-target flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    active ? "bg-brand text-inverse" : "text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
  }`;
}

export function Sidebar({ currentPath }: SidebarProps) {
  const profile = useAuth();
  const [open, setOpen] = useState(false);

  const link = (item: NavItem) => {
    const active = currentPath === item.path;
    const Icon = item.icon;
    return (
      <a key={item.path} href={item.path} className={navClass(active)} aria-current={active ? "page" : undefined}>
        <Icon size={17} aria-hidden="true" />
        <span className="flex flex-col leading-tight">
          <span className="font-medium">{item.label}</span>
          <span className={`text-[0.7rem] ${active ? "text-inverse/80" : "text-subtlest"}`}>{item.hint}</span>
        </span>
      </a>
    );
  };

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 lg:hidden">
        <a href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-bold text-[0.7rem] font-bold text-inverse">
            AB
          </span>
          AccessBridge
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="workspace-nav"
          className="icon-btn"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <nav id="workspace-nav" aria-label="Workspace" className="space-y-1 border-b border-border bg-surface p-3 lg:hidden">
          {WORKSPACE_NAV.map(link)}
          {WORKSPACE_NAV_SECONDARY.map(link)}
          <a href="/" className={navClass(false)}>
            <Home size={17} aria-hidden="true" />
            <span className="font-medium">Home</span>
          </a>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 space-y-4 p-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="AccessBridge home">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-bold text-[0.75rem] font-bold text-inverse">
              AB
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-text">AccessBridge</span>
              <span className="text-[0.7rem] text-subtle">Any language. Any document.</span>
            </span>
          </a>

          <nav aria-label="Workspace" className="space-y-1">
            {WORKSPACE_NAV.map(link)}
          </nav>

          <div className="space-y-1 border-t border-border pt-3">
            {WORKSPACE_NAV_SECONDARY.map(link)}
            <a href="/" className={navClass(false)}>
              <Home size={17} aria-hidden="true" />
              <span className="font-medium">Home</span>
            </a>
          </div>

          <div className="border-t border-border pt-3">
            <a href="/auth" className={navClass(false)}>
              <User size={17} aria-hidden="true" />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">{profile ? profile.name : "Guest mode"}</span>
                <span className="text-[0.7rem] text-subtlest">
                  {profile ? "Signed in" : "Sign in or create an account"}
                </span>
              </span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

export interface WorkspaceLayoutProps {
  currentPath: string;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Set false when the page renders its own heading (Upload, Evaluation, ...). */
  showHeading?: boolean;
}

export function WorkspaceLayout({
  currentPath,
  children,
  title,
  subtitle,
  showHeading = true,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar currentPath={currentPath} />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-[900px]">
          {showHeading && (
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-text">{title}</h1>
              {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
