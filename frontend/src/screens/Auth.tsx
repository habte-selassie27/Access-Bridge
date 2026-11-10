import { useState } from "react";
import { User, LogIn, UserPlus, ArrowLeft, ShieldCheck } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { signIn, signUp, continueAsGuest, useAuth } from "../lib/auth.ts";

export interface AuthProps {
  onBack: () => void;
  onSignedIn: () => void;
}

/**
 * Sign in, create a profile, or carry on as a guest.
 *
 * The profile lives in this browser only. There is no server account, no
 * password ever leaves the device, and a profile only changes which set of
 * saved documents you see.
 */
export function Auth({ onBack, onSignedIn }: AuthProps) {
  const profile = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = mode === "signup" ? await signUp(name, password) : await signIn(name, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message || "That did not work.");
      return;
    }
    onSignedIn();
  };

  return (
    <WorkspaceLayout
      currentPath="/auth"
      title={profile ? `Signed in as ${profile.name}` : "Sign in"}
      subtitle="A profile is optional. Guest mode does everything, without a password."
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>

        {profile ? (
          <section className="rounded-lg border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              <User size={16} aria-hidden="true" /> {profile.name}
            </p>
            <p className="mt-1 text-[0.8rem] text-subtle">
              Your saved documents are scoped to this profile on this device.
            </p>
            <button
              type="button"
              onClick={() => {
                continueAsGuest();
                onSignedIn();
              }}
              className="touch-target mt-3 rounded-md border border-input px-4 py-2 text-sm text-text"
            >
              Switch to guest
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); }}
                  aria-pressed={mode === "signup"}
                  className={`touch-target inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
                    mode === "signup" ? "border-brand bg-brand text-inverse" : "border-input bg-background text-text"
                  }`}
                >
                  <UserPlus size={15} aria-hidden="true" /> Create a profile
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(null); }}
                  aria-pressed={mode === "signin"}
                  className={`touch-target inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
                    mode === "signin" ? "border-brand bg-brand text-inverse" : "border-input bg-background text-text"
                  }`}
                >
                  <LogIn size={15} aria-hidden="true" /> Sign in
                </button>
              </div>

              <label className="block">
                <span className="form-label">Name</span>
                <input
                  className="textfield mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  placeholder="Your name on this device"
                />
              </label>
              <label className="mt-3 block">
                <span className="form-label">Password</span>
                <input
                  type="password"
                  className="textfield mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="At least eight characters"
                />
              </label>

              {error && (
                <p role="alert" className="mt-3 rounded-md border border-danger-border bg-danger-bg p-2 text-sm text-danger">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="touch-target mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-inverse disabled:opacity-60"
              >
                {busy ? "Working…" : mode === "signup" ? "Create profile" : "Sign in"}
              </button>
            </section>

            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-base font-semibold text-text">Or carry on as a guest</h2>
              <p className="mt-1 text-[0.8rem] text-subtle">
                Everything works without a profile: read documents, translate, simplify, check your eligibility.
                Guest documents are kept separately from a signed-in profile on the same device.
              </p>
              <button
                type="button"
                onClick={() => {
                  continueAsGuest();
                  onSignedIn();
                }}
                className="touch-target mt-3 rounded-md border border-input px-4 py-2 text-sm text-text"
              >
                Continue as guest
              </button>
            </section>

            <p className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3 text-[0.8rem] text-subtle">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              There is no server account. Your name and a salted hash of your password stay in this browser, and
              the password is never sent anywhere.
            </p>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
