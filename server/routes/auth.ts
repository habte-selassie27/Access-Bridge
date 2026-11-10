import { Router } from "express";
import { authStore, AuthError } from "../lib/auth/store.ts";
import { checkRateLimit } from "../lib/security/rate-limit.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { log } from "../lib/observability/logger.ts";
import { noCache } from "../middleware/request-logger.ts";

const router = Router();
router.use(noCache);

const SESSION_COOKIE = "access-bridge_session";
const NAME_RE = /^[\p{L}\p{N} ._'-]{2,40}$/u;

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function sessionToken(req: any): string {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || "";
}

function cookieSameSite(): "lax" | "none" {
  // A split-host deployment (VITE_API_BASE points at another site) needs
  // SameSite=None for the session cookie to be sent with cross-site XHR.
  return (process.env.COOKIE_SAMESITE || "").toLowerCase() === "none" ? "none" : "lax";
}

function secureCookie(): boolean {
  // Browsers only accept SameSite=None together with Secure.
  if (cookieSameSite() === "none") return true;
  return process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
}

function setSessionCookie(res: any, token: string, expiresAt: number): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: cookieSameSite(),
    secure: secureCookie(),
    path: "/",
    expires: new Date(expiresAt),
  });
}

function clearSessionCookie(res: any): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: cookieSameSite(),
    secure: secureCookie(),
    path: "/",
  });
}

function fail(res: any, status: number, message: string, code: string): void {
  res.status(status).json({ ok: false, error: { message, code, retryable: false } });
}

function validate(name: unknown, password: unknown): { name: string; password: string } | null {
  if (typeof name !== "string" || typeof password !== "string") return null;
  const trimmed = name.trim();
  if (!NAME_RE.test(trimmed)) return null;
  if (password.length < 8 || password.length > 128) return null;
  return { name: trimmed, password };
}

router.post("/register", async (req, res) => {
  const requestId = newRequestId();
  if (!checkRateLimit(`auth:${clientIp(req)}`, 10)) {
    return fail(res, 429, "Too many attempts. Try again in a minute.", "RATE_LIMITED");
  }
  const input = validate(req.body?.name, req.body?.password);
  if (!input) {
    return fail(res, 400, "Use a name of 2–40 characters and a password of at least 8 characters.", "INVALID_INPUT");
  }
  try {
    const profile = await authStore.createUser(input.name, input.password);
    const session = await authStore.createSession(profile.id);
    setSessionCookie(res, session.token, session.expiresAt);
    log("info", "account created", { requestId, userId: profile.id });
    return res.status(201).json({ ok: true, data: { profile } });
  } catch (err) {
    if (err instanceof AuthError) return fail(res, err.status, err.message, err.code);
    log("error", "register failed", { requestId, err: String(err) });
    return fail(res, 500, "Could not create the account right now.", "UPSTREAM");
  }
});

router.post("/login", async (req, res) => {
  const requestId = newRequestId();
  if (!checkRateLimit(`auth:${clientIp(req)}`, 10)) {
    return fail(res, 429, "Too many attempts. Try again in a minute.", "RATE_LIMITED");
  }
  const input = validate(req.body?.name, req.body?.password);
  if (!input) {
    return fail(res, 400, "Enter your name and password.", "INVALID_INPUT");
  }
  try {
    const profile = await authStore.verifyUser(input.name, input.password);
    // The same message for an unknown name and a wrong password: do not turn
    // account names into an enumeration oracle.
    if (!profile) return fail(res, 401, "That name or password is not right.", "UNAUTHENTICATED");
    const session = await authStore.createSession(profile.id);
    setSessionCookie(res, session.token, session.expiresAt);
    log("info", "account login", { requestId, userId: profile.id });
    return res.json({ ok: true, data: { profile } });
  } catch (err) {
    if (err instanceof AuthError) return fail(res, err.status, err.message, err.code);
    log("error", "login failed", { requestId, err: String(err) });
    return fail(res, 500, "Could not sign in right now.", "UPSTREAM");
  }
});

router.get("/me", async (req, res) => {
  try {
    const profile = await authStore.userForToken(sessionToken(req));
    return res.json({ ok: true, data: { profile } });
  } catch (err) {
    if (err instanceof AuthError) return fail(res, err.status, err.message, err.code);
    return fail(res, 500, "Could not read the session.", "UPSTREAM");
  }
});

router.post("/logout", async (req, res) => {
  try {
    await authStore.deleteSession(sessionToken(req));
  } catch {
    // Clearing the cookie is still the right outcome.
  }
  clearSessionCookie(res);
  return res.json({ ok: true, data: { profile: null } });
});

router.delete("/account", async (req, res) => {
  const token = sessionToken(req);
  try {
    const profile = await authStore.userForToken(token);
    if (!profile) return fail(res, 401, "Sign in first.", "UNAUTHENTICATED");
    await authStore.deleteUser(profile.id);
    clearSessionCookie(res);
    return res.json({ ok: true, data: { profile: null } });
  } catch (err) {
    if (err instanceof AuthError) return fail(res, err.status, err.message, err.code);
    return fail(res, 500, "Could not delete the account right now.", "UPSTREAM");
  }
});

export default router;
