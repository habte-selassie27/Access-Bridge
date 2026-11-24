import type { PrivacyMode } from "./modes.ts";

const KEY = "ab_privacy_mode_v1";

export function loadPrivacyMode(): PrivacyMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "private" || v === "smart" || v === "cloud") return v;
  } catch {
    /* ignore */
  }
  return "smart";
}

export function savePrivacyMode(mode: PrivacyMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}