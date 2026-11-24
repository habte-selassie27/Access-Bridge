/**
 * App Check setup help.
 *
 * Firebase AI Logic rejects every cloud call until the browser is attested.
 * In local development that means registering this browser's App Check debug
 * token. These helpers surface the exact console URL and, when it can be read,
 * the token itself — instead of making the developer copy it out of DevTools.
 *
 * There is deliberately no CLI helper: firebase-tools 15.x no longer ships the
 * `appcheck:debugtokens:*` commands, so pointing people at them would be wrong.
 */
import { appCheckDebugToken, firebaseConfig } from "./config.ts";

const DEBUG_DB = "firebase-app-check-database";
const DEBUG_STORE = "firebase-app-check-store";
const DEBUG_KEY = "debug-token";

export function getAppCheckConsoleUrl(): string | null {
  if (!firebaseConfig) return null;
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/appcheck/apps?selectedAppId=${firebaseConfig.appId}`;
}

function readDebugTokenRecord(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let settled = false;
    const done = (value: string | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    // The SDK creates this database; opening at version 1 must not upgrade it.
    const req = indexedDB.open(DEBUG_DB);
    req.onupgradeneeded = () => done(null);
    req.onerror = () => done(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(DEBUG_STORE, "readonly");
        const get = tx.objectStore(DEBUG_STORE).get(DEBUG_KEY);
        get.onsuccess = () => {
          const record = get.result as { value?: string } | undefined;
          done(typeof record?.value === "string" && record.value ? record.value : null);
        };
        get.onerror = () => done(null);
      } catch {
        done(null);
      } finally {
        setTimeout(() => db.close(), 0);
      }
    };
    setTimeout(() => done(null), 2000);
  });
}

/**
 * The debug token the SDK is actually using: an explicit UUID from env, the
 * per-browser token the SDK generated, or null when debug App Check is off.
 */
export async function readDebugToken(): Promise<string | null> {
  if (typeof appCheckDebugToken === "string" && appCheckDebugToken) {
    return appCheckDebugToken;
  }
  if (appCheckDebugToken !== true) return null;
  return readDebugTokenRecord();
}
