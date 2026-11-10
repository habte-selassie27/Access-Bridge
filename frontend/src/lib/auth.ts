import { useSyncExternalStore } from "react";

/**
 * Server-authenticated accounts.
 *
 * The password is sent once to our own API, checked there with a slow hash,
 * and never stored in the browser. The server sets an HTTP-only session cookie;
 * this module only keeps a cached profile so the right library scope is shown
 * before the first network reply. Guest mode is still the default and needs
 * neither a connection nor an account.
 */

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

const SESSION_KEY = "access-bridge-auth-session";
export const GUEST_ID = "guest";

const API_BASE =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE || "";

let current: Profile | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function readCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed && parsed.id && parsed.name ? parsed : null;
  } catch {
    return null;
  }
}

function setSession(profile: Profile | null): void {
  try {
    if (profile) localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // A blocked storage API must not make sign-in fail.
  }
  current = profile;
  emit();
}

interface AuthResponse {
  ok: boolean;
  data?: { profile: Profile | null };
  error?: { message?: string; code?: string };
}

async function request(path: string, init: RequestInit = {}): Promise<{
  ok: boolean;
  status: number;
  profile?: Profile | null;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/auth${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    let payload: AuthResponse | null = null;
    try {
      payload = (await res.json()) as AuthResponse;
    } catch {
      // fall through to a clean message
    }
    if (!res.ok || payload?.ok === false) {
      return {
        ok: false,
        status: res.status,
        message: payload?.error?.message || "That did not work. Please try again.",
      };
    }
    return { ok: true, status: res.status, profile: payload?.data?.profile ?? null };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Could not reach the account server. Check your connection, or continue as a guest.",
    };
  }
}

/** Read the cached session before the first paint. */
export function initAuth(): Profile | null {
  if (loaded) return current;
  loaded = true;
  current = readCachedProfile();
  return current;
}

export function getProfile(): Profile | null {
  if (!loaded) initAuth();
  return current;
}

/** The key the library is scoped to. Guest documents live under "guest". */
export function scopeId(): string {
  return current?.id ?? GUEST_ID;
}

export function isGuest(): boolean {
  return !getProfile();
}

export interface AuthResult {
  ok: boolean;
  message?: string;
}

/**
 * Reconcile the cached profile with the server session.
 *
 * A network failure keeps the cached profile: the API being unreachable must
 * not sign a reader out in the middle of a document. Only an explicit signed-
 * out response clears it.
 */
export async function refreshAuth(): Promise<Profile | null> {
  const result = await request("/me");
  if (!result.ok) return current;
  setSession(result.profile ?? null);
  return current;
}

export async function signUp(name: string, password: string): Promise<AuthResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, message: "Pick a name with at least two characters." };
  if (password.length < 8) return { ok: false, message: "Use a password of at least eight characters." };

  const result = await request("/register", {
    method: "POST",
    body: JSON.stringify({ name: trimmed, password }),
  });
  if (!result.ok || !result.profile) {
    return { ok: false, message: result.message || "Could not create the account." };
  }
  setSession(result.profile);
  return { ok: true };
}

export async function signIn(name: string, password: string): Promise<AuthResult> {
  const result = await request("/login", {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), password }),
  });
  if (!result.ok || !result.profile) {
    return { ok: false, message: result.message || "That name or password is not right." };
  }
  setSession(result.profile);
  return { ok: true };
}

/** Clear the local cache immediately; tell the server to drop the session too. */
export function continueAsGuest(): void {
  setSession(null);
  void request("/logout", { method: "POST" });
}

export async function signOut(): Promise<void> {
  await request("/logout", { method: "POST" });
  setSession(null);
}

/** Delete the signed-in account on the server, then clear this browser. */
export async function deleteProfile(id: string): Promise<void> {
  if (current?.id !== id) return;
  await request("/account", { method: "DELETE" });
  setSession(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): Profile | null {
  return useSyncExternalStore(subscribe, getProfile, getProfile);
}
