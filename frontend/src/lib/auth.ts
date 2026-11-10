import { useSyncExternalStore } from "react";

/**
 * Local accounts.
 *
 * There is no server-side account system: AccessBridge never sends a password
 * anywhere, and there is no database of users. A profile is a name and a
 * salted password hash held in this browser, and it scopes the personal
 * library so two people using the same device do not see each other's
 * documents. Guest mode needs no password at all and is the default.
 *
 * The library is the only thing an account changes. Nothing about the
 * documents themselves is stored either way.
 */

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

interface StoredProfile extends Profile {
  salt: string;
  hash: string;
}

const USERS_KEY = "pastewise-auth-users";
const SESSION_KEY = "pastewise-auth-session";
export const GUEST_ID = "guest";

let current: Profile | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function readUsers(): StoredProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredProfile[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredProfile[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function derive(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 120_000, hash: "SHA-256" },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish comparison, so a wrong password leaks no timing. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function loadSession(): Profile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function setSession(profile: Profile | null): void {
  try {
    if (profile) localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  current = profile;
  emit();
}

/** Read the session before the first paint. */
export function initAuth(): Profile | null {
  if (loaded) return current;
  loaded = true;
  current = loadSession();
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

export async function signUp(name: string, password: string): Promise<AuthResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, message: "Pick a name with at least two characters." };
  if (password.length < 8) return { ok: false, message: "Use a password of at least eight characters." };
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { ok: false, message: "This browser cannot store a password safely. Continue as a guest instead." };
  }

  const users = readUsers();
  if (users.some((u) => u.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: "That name is already taken on this device." };
  }

  const salt = randomHex(16);
  const hash = await derive(password, salt);
  const profile: StoredProfile = {
    id: `user_${randomHex(6)}`,
    name: trimmed,
    createdAt: Date.now(),
    salt,
    hash,
  };
  writeUsers([...users, profile]);
  setSession({ id: profile.id, name: profile.name, createdAt: profile.createdAt });
  return { ok: true };
}

export async function signIn(name: string, password: string): Promise<AuthResult> {
  const trimmed = name.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.name.toLowerCase() === trimmed);
  if (!user) return { ok: false, message: "No profile with that name on this device." };
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { ok: false, message: "This browser cannot check a password safely. Continue as a guest instead." };
  }
  const hash = await derive(password, user.salt);
  if (!equal(hash, user.hash)) return { ok: false, message: "That password is not right." };
  setSession({ id: user.id, name: user.name, createdAt: user.createdAt });
  return { ok: true };
}

export function continueAsGuest(): void {
  setSession(null);
}

export function signOut(): void {
  setSession(null);
}

/** Remove a profile and everything stored under it. */
export function deleteProfile(id: string): void {
  const users = readUsers().filter((u) => u.id !== id);
  writeUsers(users);
  if (current?.id === id) setSession(null);
}

export function listProfiles(): { id: string; name: string; createdAt: number }[] {
  return readUsers().map((u) => ({ id: u.id, name: u.name, createdAt: u.createdAt }));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): Profile | null {
  return useSyncExternalStore(subscribe, getProfile, getProfile);
}
