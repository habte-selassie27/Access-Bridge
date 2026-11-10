import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { AuthStore, AuthError } = await import("../../server/lib/auth/store.ts");

test("server account store", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pastewise-auth-"));
  const file = path.join(dir, "users.json");
  const store = new AuthStore(file, 30);
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  let selam: { id: string; name: string; createdAt: number };
  let token = "";

  await t.test("a profile is created without exposing the password hash", async () => {
    selam = await store.createUser("Selam", "correct horse battery");
    assert.equal(selam.name, "Selam");
    assert.deepEqual(Object.keys(selam).sort(), ["createdAt", "id", "name"]);
  });

  await t.test("the same name cannot be taken twice, ignoring case and spacing", async () => {
    await assert.rejects(
      () => store.createUser("  sELAM ", "another good password"),
      (err: unknown) => err instanceof AuthError && err.code === "NAME_TAKEN"
    );
  });

  await t.test("the stored file never contains the password", async () => {
    const raw = await fs.readFile(file, "utf8");
    assert.ok(!raw.includes("correct horse battery"));
    assert.ok(raw.includes("salt"));
    assert.ok(raw.includes("hash"));
  });

  await t.test("the right password verifies and the wrong one does not", async () => {
    assert.equal((await store.verifyUser("Selam", "correct horse battery"))?.id, selam.id);
    assert.equal(await store.verifyUser("Selam", "wrong password"), null);
    assert.equal(await store.verifyUser("Nobody", "whatever"), null);
  });

  await t.test("a session token resolves to the user and is stored hashed", async () => {
    const session = await store.createSession(selam.id);
    token = session.token;
    assert.equal((await store.userForToken(token))?.id, selam.id);
    const raw = await fs.readFile(file, "utf8");
    assert.ok(!raw.includes(token), "the raw session token was written to disk");
  });

  await t.test("a session survives a server restart", async () => {
    const reopened = new AuthStore(file, 30);
    assert.equal((await reopened.userForToken(token))?.id, selam.id);
  });

  await t.test("logging out revokes only that session", async () => {
    await store.deleteSession(token);
    assert.equal(await store.userForToken(token), null);
  });

  await t.test("deleting the account removes its sessions", async () => {
    const session = await store.createSession(selam.id);
    await store.deleteUser(selam.id);
    assert.equal(await store.userForToken(session.token), null);
    assert.equal(await store.verifyUser("Selam", "correct horse battery"), null);
  });
});

// The client module reads localStorage at import time, so install the mock
// first. It talks to the API through fetch; the fake below behaves like the
// auth routes without needing a listening server.
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
};

interface Call {
  url: string;
  init: RequestInit;
}
const calls: Call[] = [];
let serverProfile: { id: string; name: string; createdAt: number } | null = null;
let registered = false;
let networkDown = false;

(globalThis as any).fetch = async (input: unknown, init: RequestInit = {}) => {
  const url = String(input);
  calls.push({ url, init });
  if (networkDown) throw new Error("offline");
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const reply = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

  if (url.endsWith("/auth/register")) {
    if (!registered) {
      registered = true;
      serverProfile = { id: "usr_1", name: body.name, createdAt: 1 };
      return reply({ ok: true, data: { profile: serverProfile } });
    }
    return reply(
      { ok: false, error: { message: "That name is already taken.", code: "NAME_TAKEN" } },
      409
    );
  }
  if (url.endsWith("/auth/login")) {
    if (body.password === "correct horse battery") {
      serverProfile = { id: "usr_1", name: "Selam", createdAt: 1 };
      return reply({ ok: true, data: { profile: serverProfile } });
    }
    return reply(
      { ok: false, error: { message: "That name or password is not right.", code: "UNAUTHENTICATED" } },
      401
    );
  }
  if (url.endsWith("/auth/me")) {
    return reply({ ok: true, data: { profile: serverProfile } });
  }
  if (url.endsWith("/auth/logout")) {
    serverProfile = null;
    return reply({ ok: true, data: { profile: null } });
  }
  if (url.endsWith("/auth/account")) {
    serverProfile = null;
    return reply({ ok: true, data: { profile: null } });
  }
  return reply({ ok: false, error: { message: "not found" } }, 404);
};

const auth = await import("../../frontend/src/lib/auth.ts");

test("server-authenticated account client", async (t) => {
  await t.test("guest mode needs nothing and no network", () => {
    auth.initAuth();
    assert.equal(auth.getProfile(), null);
    assert.equal(auth.isGuest(), true);
    assert.equal(auth.scopeId(), "guest");
  });

  await t.test("a short password is refused before any request", async () => {
    const before = calls.length;
    const result = await auth.signUp("Someone", "short");
    assert.equal(result.ok, false);
    assert.match(result.message ?? "", /eight characters/);
    assert.equal(calls.length, before);
  });

  await t.test("signing up creates a server session and scopes the library to it", async () => {
    const result = await auth.signUp("Selam", "correct horse battery");
    assert.equal(result.ok, true);
    assert.equal(auth.getProfile()?.name, "Selam");
    assert.equal(auth.scopeId(), "usr_1");
    const register = calls.find((c) => c.url.endsWith("/auth/register"));
    assert.equal(register?.init.credentials, "include");
    assert.equal(register?.init.method, "POST");
  });

  await t.test("the password is never written to browser storage", () => {
    const raw = JSON.stringify([...storage]);
    assert.ok(!raw.includes("correct horse battery"));
    assert.ok(raw.includes("usr_1"));
  });

  await t.test("refreshAuth picks up a session change from another tab", async () => {
    serverProfile = { id: "usr_1", name: "Selam T.", createdAt: 1 };
    const profile = await auth.refreshAuth();
    assert.equal(profile?.name, "Selam T.");
  });

  await t.test("a network failure keeps the cached session", async () => {
    networkDown = true;
    await auth.refreshAuth();
    networkDown = false;
    assert.equal(auth.getProfile()?.name, "Selam T.");
  });

  await t.test("a duplicate name is reported from the server", async () => {
    const result = await auth.signUp("Selam", "another good password");
    assert.equal(result.ok, false);
    assert.match(result.message ?? "", /already taken/);
  });

  await t.test("signing out clears the browser cache and the server session", async () => {
    await auth.signOut();
    assert.equal(auth.getProfile(), null);
    assert.equal(auth.scopeId(), "guest");
    assert.equal(serverProfile, null);
    assert.ok(calls.some((c) => c.url.endsWith("/auth/logout")));
  });

  await t.test("the wrong password does not sign in", async () => {
    const result = await auth.signIn("Selam", "wrong password");
    assert.equal(result.ok, false);
    assert.equal(auth.getProfile(), null);
  });

  await t.test("the right password signs in with a cookie session", async () => {
    const result = await auth.signIn("Selam", "correct horse battery");
    assert.equal(result.ok, true);
    assert.equal(auth.getProfile()?.id, "usr_1");
    const login = calls.find((c) => c.url.endsWith("/auth/login"));
    assert.equal(login?.init.credentials, "include");
  });

  await t.test("deleting the account clears the session", async () => {
    await auth.deleteProfile("usr_1");
    assert.equal(auth.getProfile(), null);
    assert.equal(serverProfile, null);
    assert.ok(calls.some((c) => c.url.endsWith("/auth/account") && c.init.method === "DELETE"));
  });
});
