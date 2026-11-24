import { useEffect, useState } from "react";
import { ShieldAlert, ExternalLink, Copy, Check } from "lucide-react";
import { getAppCheckConsoleUrl, readDebugToken } from "../../lib/hybrid/appCheckHelp.ts";

/**
 * Explains an APP_CHECK_FAILED response and shows exactly what to register.
 * Rendered only when the SDK rejected a call, so it never implies success.
 *
 * Registration is console-only: current firebase-tools (verified on 15.2.1) no
 * longer ships the `appcheck:debugtokens:*` commands, so the UI must not tell
 * people to run them.
 */
export function AppCheckHelp() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readDebugToken().then((t) => {
      if (!cancelled) setToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const consoleUrl = getAppCheckConsoleUrl();

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; the text stays selectable */
    }
  };

  return (
    <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
      <p className="flex items-start gap-2 font-medium text-text">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        Firebase App Check rejected this call
      </p>
      <p className="mt-1 text-subtle">
        Cloud inference stays blocked until this browser is registered for App Check. This is a
        project setting, not a document problem — nothing from your document was sent.
      </p>

      <ol className="mt-2 list-decimal space-y-2 pl-4 text-subtle">
        <li>
          {token ? (
            <>
              Register this browser's debug token:
              <code className="mt-1 block break-all rounded bg-neutral-subtle px-2 py-1 font-mono text-xs text-text">
                {token}
              </code>
              <button
                type="button"
                onClick={() => copy(token)}
                className="mt-1 inline-flex items-center gap-1 text-xs text-text underline underline-offset-2 hover:text-primary"
              >
                {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                {copied ? "Copied" : "Copy token"}
              </button>
            </>
          ) : (
            <>
              Copy the line{" "}
              <code className="font-mono text-xs text-text">Firebase App Check debug token: …</code>{" "}
              from the browser console. If it is not there, set{" "}
              <code className="font-mono text-xs text-text">VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true</code>{" "}
              and reload.
            </>
          )}
        </li>
        <li className="flex flex-wrap items-center gap-2">
          Open Firebase App Check for this project, open the app, and add it under “Manage debug
          tokens”.
          {consoleUrl && (
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              Open App Check settings
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </li>
        <li>Reload this page, then run the evaluation again.</li>
      </ol>

      <p className="mt-2 text-xs text-subtle">
        Debug tokens are for local development only. The deployed site must use the reCAPTCHA
        Enterprise site key for its own domain.
      </p>
    </div>
  );
}
