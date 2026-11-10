import { useSyncExternalStore } from "react";

/**
 * Accessibility preferences for the app itself.
 *
 * A product that claims to remove access barriers has to be usable by the
 * people it claims to serve, so these are first-class settings rather than a
 * hidden stylesheet. Everything is stored locally in the browser and applied
 * as data attributes on <html>, so the CSS owns the rendering and this module
 * only owns the state.
 */
export type Theme = "dark" | "light";
export type FontScale = "sm" | "md" | "lg" | "xl";
export type Contrast = "normal" | "high";
export type Spacing = "normal" | "relaxed";
export type MotionPreference = "system" | "reduced";
export type Density = "comfortable" | "compact";

export interface A11ySettings {
  theme: Theme;
  fontScale: FontScale;
  contrast: Contrast;
  spacing: Spacing;
  /** In-app override for prefers-reduced-motion. */
  motion: MotionPreference;
  /** Content density: comfortable (default) or compact. */
  density: Density;
  /** Simple interface mode: one idea per screen, less decoration. */
  simpleMode: boolean;
}

export const DEFAULT_A11Y: A11ySettings = {
  theme: "dark",
  fontScale: "md",
  contrast: "normal",
  spacing: "normal",
  motion: "system",
  density: "comfortable",
  simpleMode: false,
};

const STORAGE_KEY = "access-bridge-a11y";

let current: A11ySettings = DEFAULT_A11Y;
const listeners = new Set<() => void>();

function readStorage(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      fontScale: (["sm", "md", "lg", "xl"] as const).includes(parsed.fontScale) ? parsed.fontScale : "md",
      contrast: parsed.contrast === "high" ? "high" : "normal",
      spacing: parsed.spacing === "relaxed" ? "relaxed" : "normal",
      motion: parsed.motion === "reduced" ? "reduced" : "system",
      density: parsed.density === "compact" ? "compact" : "comfortable",
      simpleMode: Boolean(parsed.simpleMode),
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

export function applyA11y(settings: A11ySettings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.fontScale = settings.fontScale;
  root.dataset.contrast = settings.contrast;
  root.dataset.spacing = settings.spacing;
  root.dataset.motion = settings.motion;
  root.dataset.density = settings.density;
  root.dataset.simpleMode = settings.simpleMode ? "on" : "off";
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function setA11y(patch: Partial<A11ySettings>): void {
  current = { ...current, ...patch };
  applyA11y(current);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode: preferences still apply for this session.
  }
  emit();
}

export function resetA11y(): void {
  current = DEFAULT_A11Y;
  applyA11y(current);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function getA11y(): A11ySettings {
  return current;
}

/**
 * Scroll behaviour for JavaScript-driven scrolling.
 *
 * The CSS override handles transitions and animations, but a JS
 * `scrollIntoView({ behavior: "smooth" })` ignores it. Callers use this so the
 * in-app reduced-motion choice applies to scrolling too.
 */
export function motionBehavior(): ScrollBehavior {
  return current.motion === "reduced" ? "auto" : "smooth";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read the stored preferences once, before the first paint. */
export function initA11y(): A11ySettings {
  current = readStorage();
  applyA11y(current);
  return current;
}

export function useA11y(): A11ySettings {
  return useSyncExternalStore(subscribe, getA11y, getA11y);
}

/** Human-readable labels, used by the settings screen and the dashboard. */
export const A11Y_LABELS: Record<keyof A11ySettings, Record<string, string>> = {
  theme: { dark: "Dark", light: "Light" },
  fontScale: { sm: "Small", md: "Default", lg: "Large", xl: "Extra large" },
  contrast: { normal: "Normal", high: "High contrast" },
  spacing: { normal: "Normal", relaxed: "Relaxed" },
  motion: { system: "Follow device", reduced: "Reduced motion" },
  density: { comfortable: "Comfortable", compact: "Compact" },
  simpleMode: { "true": "On", "false": "Off" },
};
