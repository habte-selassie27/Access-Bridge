import { useState } from "react";
import { Globe, Accessibility, Database, Trash2, User } from "lucide-react";
import { A11yControls } from "../components/settings/A11yControls.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { clearEverything, listDocs } from "../lib/library.ts";
import { continueAsGuest, deleteProfile, useAuth } from "../lib/auth.ts";
import { loadLastLanguage, saveLastLanguage, languageName, languageTier } from "../lib/languages.ts";
import type { LanguageCode } from "../lib/languages.ts";

export interface SettingsProps {
  onSignedIn?: () => void;
  onNavigate?: (path: string) => void;
}

const TIER_LEGEND = [
  { label: "Source language", hint: "Documents arrive in this language." },
  { label: "Measured", hint: "Amharic, Oromo and Tigrinya have published accuracy numbers." },
  { label: "Experimental", hint: "Supported, but not yet evaluated." },
];

export function Settings({ onSignedIn, onNavigate }: SettingsProps) {
  const [lang, setLang] = useState<LanguageCode>(() => loadLastLanguage());
  const [count, setCount] = useState(() => listDocs().length);
  const [confirming, setConfirming] = useState(false);
  const [confirmingAccount, setConfirmingAccount] = useState(false);
  const profile = useAuth();

  const tier = languageTier(lang);
  const tierLabel = tier === "source" ? "Source language" : tier === "measured" ? "Measured" : "Experimental";

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-text sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-subtle">
          Language and accessibility preferences. Both are stored on this device only.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
          <Globe size={16} aria-hidden="true" /> Preferred language
        </h2>
        <p className="mb-3 text-[0.8rem] text-subtle">
          Used for new explanations, the voice readout and follow-up answers.
        </p>
        <LanguageChips
          value={lang}
          onChange={(code) => {
            setLang(code);
            saveLastLanguage(code);
          }}
        />

        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-text">How well each language is backed up</h3>
          <dl className="grid gap-2 sm:grid-cols-3">
            {TIER_LEGEND.map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-background p-3">
                <dt className="text-[0.8rem] font-semibold text-text">{item.label}</dt>
                <dd className="mt-0.5 text-[0.75rem] leading-snug text-subtle">{item.hint}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[0.75rem] text-subtle">
            {languageName(lang)} is currently marked <strong className="text-text">{tierLabel}</strong>. Measured
            languages have published accuracy numbers on the{" "}
            <a
              href="/evaluation"
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate("/evaluation");
              }}
              className="underline underline-offset-2 hover:text-text"
            >
              evaluation page
            </a>
            ; experimental ones are supported but not yet scored.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text">
          <Accessibility size={16} aria-hidden="true" /> Accessibility
        </h2>
        <A11yControls />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
          <User size={16} aria-hidden="true" /> Profile
        </h2>
        <p className="text-[0.8rem] text-subtle">
          {profile
            ? `Signed in as ${profile.name} with a server account. Your saved documents stay on this device.`
            : "You are using AccessBridge as a guest. Everything works without an account."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/auth"
            onClick={(event) => {
              if (!onNavigate) return;
              event.preventDefault();
              onNavigate("/auth");
            }}
            className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-text"
          >
            {profile ? "Switch profile" : "Sign in or create a profile"}
          </a>
          {profile && (
            <>
              <button
                type="button"
                onClick={() => {
                  continueAsGuest();
                  onSignedIn?.();
                }}
                className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text"
              >
                Carry on as guest
              </button>
              {confirmingAccount ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteProfile(profile.id);
                      setConfirmingAccount(false);
                      onSignedIn?.();
                    }}
                    className="touch-target rounded-md bg-danger px-4 py-2 text-sm font-medium text-inverse"
                  >
                    Yes, delete my account
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingAccount(false)}
                    className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingAccount(true)}
                  className="touch-target rounded-md border border-danger-border px-4 py-2 text-sm text-danger"
                >
                  Delete account
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
          <Database size={16} aria-hidden="true" /> Your data
        </h2>
        <p className="text-[0.8rem] text-subtle">
          {count} saved document{count === 1 ? "" : "s"}, plus your checklist progress and translation history, are
          stored in this browser. Your account is separate: it is a server session, and documents are never
          uploaded.
        </p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearEverything();
                setCount(0);
                setConfirming(false);
              }}
              className="touch-target rounded-md bg-danger px-4 py-2 text-sm font-medium text-inverse"
            >
              Yes, delete everything
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="touch-target mt-3 inline-flex items-center gap-2 rounded-md border border-danger-border px-4 py-2 text-sm text-danger"
          >
            <Trash2 size={15} aria-hidden="true" /> Delete my saved data
          </button>
        )}
      </section>
    </section>
  );
}
