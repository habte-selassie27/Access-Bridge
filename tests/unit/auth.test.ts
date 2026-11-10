import { test } from "node:test";
import assert from "node:assert/strict";

// localStorage has to exist before the auth module is imported.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const {
  signUp,
  signIn,
  signOut,
  continueAsGuest,
  getProfile,
  scopeId,
  isGuest,
  listProfiles,
  deleteProfile,
} = await import("../../frontend/src/lib/auth.ts");

test("local accounts", async (t) => {
  await t.test("guest mode needs nothing", () => {
    continueAsGuest();
    assert.equal(getProfile(), null);
    assert.equal(isGuest(), true);
    assert.equal(scopeId(), "guest");
  });

  await t.test("a profile can be created", async () => {
    const result = await signUp("Selam", "correct horse battery");
    assert.equal(result.ok, true);
    assert.equal(getProfile()?.name, "Selam");
    assert.equal(scopeId(), getProfile()?.id);
  });

  await t.test("the same name cannot be taken twice", async () => {
    const result = await signUp("Selam", "another password");
    assert.equal(result.ok, false);
    assert.match(result.message ?? "", /already taken/);
  });

  await t.test("a short password is refused", async () => {
    const result = await signUp("Someone", "short");
    assert.equal(result.ok, false);
    assert.match(result.message ?? "", /eight characters/);
  });

  await t.test("the password is never stored in the clear", () => {
    const raw = store.get("pastewise-auth-users") ?? "";
    assert.ok(!raw.includes("correct horse battery"));
    assert.ok(raw.includes("salt"));
    assert.ok(raw.includes("hash"));
  });

  await t.test("signing in with the right password works", async () => {
    signOut();
    assert.equal(getProfile(), null);
    const result = await signIn("Selam", "correct horse battery");
    assert.equal(result.ok, true);
    assert.equal(getProfile()?.name, "Selam");
  });

  await t.test("signing in with the wrong password fails", async () => {
    signOut();
    const result = await signIn("Selam", "wrong password");
    assert.equal(result.ok, false);
    assert.equal(getProfile(), null);
  });

  await t.test("signing in as someone who does not exist fails", async () => {
    const result = await signIn("Nobody", "whatever");
    assert.equal(result.ok, false);
  });

  await t.test("the library scope changes with the profile", async () => {
    await signUp("Abebe", "another good password");
    const signedInScope = scopeId();
    continueAsGuest();
    assert.equal(scopeId(), "guest");
    assert.notEqual(scopeId(), signedInScope);
  });

  await t.test("a profile can be deleted", async () => {
    await signIn("Abebe", "another good password");
    const profile = getProfile();
    assert.ok(profile);
    deleteProfile(profile!.id);
    assert.equal(
      listProfiles().some((p) => p.id === profile!.id),
      false
    );
    assert.equal(getProfile(), null);
  });
});
